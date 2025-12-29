// ===== DeepSeek API Configuration =====
const DeepSeekAPI = {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    
    pricing: {
        input: 0.14,
        output: 0.28
    },
    
    estimateTokens(text) {
        return Math.ceil(text.length / 3);
    },
    
    async request(messages, temperature = 0.3) {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AppState.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: temperature,
                max_tokens: 4000,
                stream: false
            })
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `API Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.usage) {
            const inputCost = (data.usage.prompt_tokens / 1000000) * this.pricing.input;
            const outputCost = (data.usage.completion_tokens / 1000000) * this.pricing.output;
            AppState.stats.estimatedCost += inputCost + outputCost;
        }
        
        return data;
    }
};

// ===== Text Extractor =====
const TextExtractor = {
    controlCodes: /\\[VNGPCI]\[\d+\]|\\[.!><^$]|\\[CFHK]/g,
    
    shouldTranslate(text, config) {
        if (!text || typeof text !== 'string') return false;
        if (text.trim() === '') return false;
        
        if (config.skipTranslated && this.hasTargetLanguage(text, config.targetLanguage)) {
            return false;
        }
        
        if (/^[\d\s\W]*$/.test(text)) return false;
        
        return true;
    },
    
    hasTargetLanguage(text, targetLang) {
        const patterns = {
            vi: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
            zh: /[\u4e00-\u9fff]/,
            ja: /[\u3040-\u309f\u30a0-\u30ff]/,
            ko: /[\uac00-\ud7af]/,
            en: /^[a-zA-Z0-9\s\.,!?'"()-]+$/
        };
        return patterns[targetLang]?.test(text) || false;
    },
    
    extractFromMap(data, config) {
        const texts = [];
        
        if (!data.events) return texts;
        
        data.events.forEach((event, eventIndex) => {
            if (!event?.pages) return;
            
            event.pages.forEach((page, pageIndex) => {
                if (!page.list) return;
                
                page.list.forEach((command, commandIndex) => {
                    // Show Text (401) & Show Scrolling Text (405)
                    if (config.translateDialogue && [401, 405].includes(command.code)) {
                        if (command.parameters?.[0]) {
                            const text = command.parameters[0];
                            if (this.shouldTranslate(text, config)) {
                                texts.push({
                                    type: 'dialogue',
                                    path: `events[${eventIndex}].pages[${pageIndex}].list[${commandIndex}].parameters[0]`,
                                    original: text
                                });
                            }
                        }
                    }
                    
                    // Show Choices (102)
                    if (config.translateDialogue && command.code === 102) {
                        if (command.parameters?.[0]) {
                            command.parameters[0].forEach((choice, choiceIndex) => {
                                if (this.shouldTranslate(choice, config)) {
                                    texts.push({
                                        type: 'choice',
                                        path: `events[${eventIndex}].pages[${pageIndex}].list[${commandIndex}].parameters[0][${choiceIndex}]`,
                                        original: choice
                                    });
                                }
                            });
                        }
                    }
                    
                    // Input Number (103) - message
                    if (config.translateDialogue && command.code === 103) {
                        // Variable ID, Digits count are in params but no text to translate
                    }
                    
                    // Button Input Processing (117)
                    // No text to translate
                    
                    // Control Variables (122) - operand might have text
                    if (command.code === 122 && command.parameters?.[4] === 4) {
                        // Script command - skip
                    }
                });
            });
        });
        
        // Map display name
        if (config.translateNames && data.displayName) {
            if (this.shouldTranslate(data.displayName, config)) {
                texts.push({
                    type: 'name',
                    path: 'displayName',
                    original: data.displayName
                });
            }
        }
        
        return texts;
    },
    
    extractFromDatabase(data, config) {
        const texts = [];
        
        if (!Array.isArray(data)) return texts;
        
        data.forEach((item, index) => {
            if (!item) return;
            
            // Name
            if (config.translateNames && item.name) {
                if (this.shouldTranslate(item.name, config)) {
                    texts.push({
                        type: 'name',
                        path: `[${index}].name`,
                        original: item.name
                    });
                }
            }
            
            // Nickname (Actors)
            if (config.translateNames && item.nickname) {
                if (this.shouldTranslate(item.nickname, config)) {
                    texts.push({
                        type: 'nickname',
                        path: `[${index}].nickname`,
                        original: item.nickname
                    });
                }
            }
            
            // Profile (Actors)
            if (config.translateDescriptions && item.profile) {
                if (this.shouldTranslate(item.profile, config)) {
                    texts.push({
                        type: 'profile',
                        path: `[${index}].profile`,
                        original: item.profile
                    });
                }
            }
            
            // Description
            if (config.translateDescriptions && item.description) {
                if (this.shouldTranslate(item.description, config)) {
                    texts.push({
                        type: 'description',
                        path: `[${index}].description`,
                        original: item.description
                    });
                }
            }
            
            // Note
            if (config.translateDescriptions && item.note) {
                if (this.shouldTranslate(item.note, config)) {
                    texts.push({
                        type: 'note',
                        path: `[${index}].note`,
                        original: item.note
                    });
                }
            }
            
            // Messages (Skills/Items)
            for (let i = 1; i <= 4; i++) {
                const msgKey = `message${i}`;
                if (config.translateDescriptions && item[msgKey]) {
                    if (this.shouldTranslate(item[msgKey], config)) {
                        texts.push({
                            type: 'message',
                            path: `[${index}].${msgKey}`,
                            original: item[msgKey]
                        });
                    }
                }
            }
        });
        
        return texts;
    },
    
    extractFromCommonEvents(data, config) {
        const texts = [];
        
        if (!Array.isArray(data)) return texts;
        
        data.forEach((event, eventIndex) => {
            if (!event) return;
            
            // Event name
            if (config.translateNames && event.name) {
                if (this.shouldTranslate(event.name, config)) {
                    texts.push({
                        type: 'name',
                        path: `[${eventIndex}].name`,
                        original: event.name
                    });
                }
            }
            
            // Event commands
            if (event.list) {
                event.list.forEach((command, commandIndex) => {
                    if (config.translateDialogue && command.code === 401 && command.parameters?.[0]) {
                        const text = command.parameters[0];
                        if (this.shouldTranslate(text, config)) {
                            texts.push({
                                type: 'dialogue',
                                path: `[${eventIndex}].list[${commandIndex}].parameters[0]`,
                                original: text
                            });
                        }
                    }
                    
                    // Choices in common events
                    if (config.translateDialogue && command.code === 102 && command.parameters?.[0]) {
                        command.parameters[0].forEach((choice, choiceIndex) => {
                            if (this.shouldTranslate(choice, config)) {
                                texts.push({
                                    type: 'choice',
                                    path: `[${eventIndex}].list[${commandIndex}].parameters[0][${choiceIndex}]`,
                                    original: choice
                                });
                            }
                        });
                    }
                });
            }
        });
        
        return texts;
    },
    
    extractControlCodes(text) {
        const codes = [];
        let match;
        const regex = new RegExp(this.controlCodes);
        while ((match = regex.exec(text)) !== null) {
            codes.push({
                code: match[0],
                index: match.index
            });
        }
        return codes;
    },
    
    removeControlCodes(text) {
        return text.replace(this.controlCodes, '{{CODE}}');
    },
    
    restoreControlCodes(translatedText, originalCodes) {
        let result = translatedText;
        originalCodes.forEach(codeObj => {
            result = result.replace('{{CODE}}', codeObj.code);
        });
        return result;
    }
};

// ===== Translation Engine =====
const TranslationEngine = {
    languageNames: {
        ja: 'Japanese',
        en: 'English',
        vi: 'Vietnamese',
        zh: 'Chinese',
        ko: 'Korean'
    },
    
    async translateBatch(texts, sourceLang, targetLang, preserveFormatting) {
        if (texts.length === 0) return [];
        
        const sourceName = this.languageNames[sourceLang] || sourceLang;
        const targetName = this.languageNames[targetLang] || targetLang;
        
        // Process texts
        const processedTexts = texts.map(item => {
            if (preserveFormatting) {
                const codes = TextExtractor.extractControlCodes(item.original);
                const cleaned = TextExtractor.removeControlCodes(item.original);
                return { ...item, cleaned, codes };
            }
            return { ...item, cleaned: item.original, codes: [] };
        });
        
        // Create prompt
        const textList = processedTexts.map((item, i) => 
            `${i + 1}. ${item.cleaned}`
        ).join('\n');
        
        const systemPrompt = `You are a professional translator specializing in video game localization for RPG Maker games.

CRITICAL TRANSLATION RULES:
1. Translate from ${sourceName} to ${targetName} naturally and accurately
2. Preserve the original meaning, tone, and character personality
3. Use appropriate gaming terminology in ${targetName}
4. Keep game-specific terms consistent (HP, MP, stats names)
5. Maintain the emotional tone (serious, humorous, dramatic)
6. For character dialogue, use natural conversational ${targetName}
7. For item/skill names, keep them concise and impactful
8. Preserve ALL {{CODE}} placeholders exactly as they appear
9. Do NOT add any explanations, notes, or comments
10. Return ONLY the numbered translations, one per line

Context: These texts are from an RPG Maker game. Consider gaming conventions and player expectations when translating.`;

        const userPrompt = `Translate these ${sourceName} texts to ${targetName}:

${textList}

Return the translations in the exact same numbered format (1., 2., 3...), one translation per line. No extra text.`;

        try {
            const response = await DeepSeekAPI.request([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);
            
            const translatedText = response.choices[0].message.content.trim();
            const translations = this.parseTranslations(translatedText, processedTexts.length);
            
            // Restore control codes
            return processedTexts.map((item, i) => {
                let translation = translations[i] || item.original;
                
                if (preserveFormatting && item.codes.length > 0) {
                    translation = TextExtractor.restoreControlCodes(translation, item.codes);
                }
                
                return {
                    ...item,
                    translated: translation
                };
            });
            
        } catch (error) {
            Logger.error(`❌ Translation error: ${error.message}`);
            throw error;
        }
    },
    
    parseTranslations(text, expectedCount) {
        const lines = text.split('\n').filter(line => line.trim());
        const translations = [];
        
        for (const line of lines) {
            // Match "1. Text" or "1) Text" or "1 - Text" etc
            const match = line.match(/^\d+[\.\)\-\:]\s*(.+)$/);
            if (match) {
                translations.push(match[1].trim());
            } else if (line.trim() && !/^\d+$/.test(line.trim())) {
                translations.push(line.trim());
            }
        }
        
        // Ensure correct count
        while (translations.length < expectedCount) {
            translations.push('');
        }
        
        return translations.slice(0, expectedCount);
    }
};

// ===== Auto Translation Engine =====
const AutoTransEngine = {
    async translateFile(jsonData, filename, config) {
        Logger.info(`📋 Phân tích: ${filename}`);
        
        // Detect file type
        const fileType = this.detectFileType(filename);
        let texts = [];
        
        switch (fileType) {
            case 'map':
                texts = TextExtractor.extractFromMap(jsonData, config);
                break;
            case 'commonEvents':
                texts = TextExtractor.extractFromCommonEvents(jsonData, config);
                break;
            case 'database':
                texts = TextExtractor.extractFromDatabase(jsonData, config);
                break;
            default:
                Logger.warning(`⚠ Không xác định: ${filename}`);
                return jsonData;
        }
        
        if (texts.length === 0) {
            Logger.info('ℹ️ Không có văn bản cần dịch');
            return jsonData;
        }
        
        Logger.info(`📝 Tìm thấy ${texts.length} đoạn văn bản`);
        
        // Translate in batches
        const batchSize = config.batchSize || 10;
        const batches = this.createBatches(texts, batchSize);
        let translatedTexts = [];
        
        for (let i = 0; i < batches.length; i++) {
            if (AppState.isPaused) break;
            
            const batch = batches[i];
            Logger.info(`🔄 Batch ${i + 1}/${batches.length} (${batch.length} câu)`);
            
            try {
                const translated = await TranslationEngine.translateBatch(
                    batch,
                    config.sourceLanguage,
                    config.targetLanguage,
                    config.preserveFormatting
                );
                
                translatedTexts.push(...translated);
                AppState.stats.textsTranslated += batch.length;
                ProgressManager.updateStats();
                
                // Delay between batches
                if (i < batches.length - 1) {
                    await this.delay(500);
                }
                
            } catch (error) {
                Logger.error(`❌ Batch ${i + 1} lỗi: ${error.message}`);
                // Keep originals on error
                translatedTexts.push(...batch.map(t => ({ ...t, translated: t.original })));
            }
        }
        
        // Apply translations
        const translatedData = this.applyTranslations(jsonData, translatedTexts);
        
        Logger.success(`✅ Hoàn thành: ${texts.length} đoạn`);
        
        return translatedData;
    },
    
    detectFileType(filename) {
        const lower = filename.toLowerCase();
        
        if (lower.startsWith('map')) return 'map';
        if (lower === 'commonevents.json') return 'commonEvents';
        
        const dbFiles = [
            'actors', 'classes', 'skills', 'items', 'weapons', 
            'armors', 'enemies', 'troops', 'states', 'animations',
            'tilesets', 'system'
        ];
        
        if (dbFiles.some(db => lower.startsWith(db))) {
            return 'database';
        }
        
        return 'unknown';
    },
    
    createBatches(texts, batchSize) {
        const batches = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            batches.push(texts.slice(i, i + batchSize));
        }
        return batches;
    },
    
    applyTranslations(data, translatedTexts) {
        const result = JSON.parse(JSON.stringify(data));
        
        translatedTexts.forEach(item => {
            try {
                this.setValueByPath(result, item.path, item.translated);
            } catch (error) {
                Logger.warning(`⚠ Không thể áp dụng: ${item.path}`);
            }
        });
        
        return result;
    },
    
    setValueByPath(obj, path, value) {
        // Parse path like "events[0].pages[1].list[2].parameters[0]"
        const parts = path.split(/[\.\[\]]/).filter(Boolean);
        
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = isNaN(parts[i]) ? parts[i] : parseInt(parts[i]);
            current = current[key];
        }
        
        const lastKey = isNaN(parts[parts.length - 1]) ? 
            parts[parts.length - 1] : 
            parseInt(parts[parts.length - 1]);
        
        current[lastKey] = value;
    },
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ===== Export =====
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DeepSeekAPI,
        TextExtractor,
        TranslationEngine,
        AutoTransEngine
    };
}

Logger.info('⚡ Translation Engine loaded!');