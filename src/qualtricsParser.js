class QualtricsParser {
  constructor() {
    this.sessionId = null;
    this.transactionId = null;
    this.currentPage = null;
    this.questions = [];
    this.responses = {};
  }

  parsePayload(payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      // Extract session information
      if (data.session) {
        this.sessionId = data.session.id;
        this.transactionId = data.session.transactionId;
      }
      
      // Extract page information
      if (data.page) {
        this.currentPage = data.page;
        this.parseQuestions(data.page.content?.questions || []);
      }
      
      return {
        sessionId: this.sessionId,
        transactionId: this.transactionId,
        questions: this.questions,
        requiresStoreNumber: this.hasQuestionType('text'),
        requiresContactInfo: this.hasQuestionType('form'),
        currentStep: this.determineCurrentStep(),
      };
    } catch (error) {
      console.error('Error parsing Qualtrics payload:', error);
      return null;
    }
  }

  parseQuestions(questions) {
    this.questions = [];
    
    for (const question of questions) {
      const parsedQuestion = {
        id: question.id,
        type: question.type,
        display: question.display,
        selector: this.extractSelector(question),
        questionInfo: this.extractQuestionInfo(question),
        choices: this.extractChoices(question),
        validation: this.extractValidation(question),
      };
      
      this.questions.push(parsedQuestion);
    }
  }

  extractSelector(question) {
    if (question.options?.customJS?.questionInfo?.Selector) {
      return question.options.customJS.questionInfo.Selector;
    }
    return null;
  }

  extractQuestionInfo(question) {
    if (question.options?.customJS?.questionInfo) {
      return {
        QuestionType: question.options.customJS.questionInfo.QuestionType,
        QuestionID: question.options.customJS.questionInfo.QuestionID,
        QuestionText: question.options.customJS.questionInfo.QuestionText,
        Selector: question.options.customJS.questionInfo.Selector,
      };
    }
    return null;
  }

  extractChoices(question) {
    if (question.choices) {
      return question.choices.map(choice => ({
        id: choice.id,
        display: choice.display,
        hasTextEntry: choice.options?.textEntry !== undefined,
      }));
    }
    return [];
  }

  extractValidation(question) {
    if (question.options?.customJS?.questionInfo?.Validation?.Settings) {
      return question.options.customJS.questionInfo.Validation.Settings;
    }
    return null;
  }

  hasQuestionType(type) {
    return this.questions.some(q => q.type === type);
  }

  determineCurrentStep() {
    // Determine which step of the survey we're on based on question types
    if (this.hasQuestionType('text') && this.questions.some(q => q.display?.toLowerCase().includes('store'))) {
      return 'store_number';
    }
    if (this.hasQuestionType('form') && this.questions.some(q => q.display?.toLowerCase().includes('email'))) {
      return 'contact_info';
    }
    if (this.hasQuestionType('db')) {
      return 'consent';
    }
    return 'unknown';
  }

  getQuestionById(questionId) {
    return this.questions.find(q => q.id === questionId);
  }

  getQuestionsByType(type) {
    return this.questions.filter(q => q.type === type);
  }

  generateResponsePayload(responses) {
    return {
      session: {
        id: this.sessionId,
        transactionId: this.transactionId,
      },
      responses: responses,
    };
  }

  extractFormFieldNames() {
    const fieldNames = {};
    
    for (const question of this.questions) {
      if (question.type === 'form' && question.choices) {
        for (const choice of question.choices) {
          // Qualtrics uses QR~QuestionID~ChoiceID format for form fields
          fieldNames[question.id] = fieldNames[question.id] || {};
          fieldNames[question.id][choice.id] = `QR~${question.id}~${choice.id}`;
        }
      } else if (question.type === 'text') {
        // Single text input uses QR~QuestionID format
        fieldNames[question.id] = `QR~${question.id}`;
      }
    }
    
    return fieldNames;
  }

  getRequiredFields() {
    const requiredFields = [];
    
    for (const question of this.questions) {
      if (question.validation?.Type !== 'None') {
        requiredFields.push({
          id: question.id,
          type: question.type,
          display: question.display,
          validation: question.validation,
        });
      }
    }
    
    return requiredFields;
  }

  reset() {
    this.sessionId = null;
    this.transactionId = null;
    this.currentPage = null;
    this.questions = [];
    this.responses = {};
  }
}

module.exports = QualtricsParser;
