import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

import { createAzure } from '@ai-sdk/azure';

const azure = createAzure({
  resourceName: 'karti-majl9zk5-eastus2', // Azure resource name
  apiKey: process.env.AZURE_OPENAI_API_KEY, // Azure OpenAI API key
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': azure('gpt-4.1'),
        'chat-model-reasoning': wrapLanguageModel({
          model: azure('DeepSeek-R1'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': azure('gpt-4.1'),
        'artifact-model': azure('gpt-4.1'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
