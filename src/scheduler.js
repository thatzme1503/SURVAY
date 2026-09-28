const cron = require('node-cron');
const config = require('../config');

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.submissionCount = 0;
    this.dailyLimit = config.scheduling.maxSubmissionsPerDay;
    this.lastResetDate = new Date().toDateString();
  }

  // Check if we've hit the daily limit
  checkDailyLimit() {
    const today = new Date().toDateString();
    
    // Reset counter if it's a new day
    if (today !== this.lastResetDate) {
      this.submissionCount = 0;
      this.lastResetDate = today;
      console.log('Daily submission counter reset');
    }
    
    return this.submissionCount < this.dailyLimit;
  }

  incrementSubmissionCount() {
    this.submissionCount++;
    console.log(`Submission count: ${this.submissionCount}/${this.dailyLimit}`);
  }

  // Schedule a task to run at specified intervals
  scheduleTask(name, cronExpression, taskFunction) {
    if (this.tasks.has(name)) {
      console.warn(`Task ${name} already exists, replacing it`);
      this.tasks.get(name).stop();
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled task: ${name}`);
        
        // Check daily limit before running
        if (!this.checkDailyLimit()) {
          console.log('Daily submission limit reached, skipping task');
          return;
        }
        
        await taskFunction();
        this.incrementSubmissionCount();
      } catch (error) {
        console.error(`Error in scheduled task ${name}:`, error);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York',
    });

    this.tasks.set(name, task);
    console.log(`Scheduled task ${name} with cron expression: ${cronExpression}`);
  }

  // Schedule form submissions at regular intervals
  scheduleFormSubmissions(submissionFunction) {
    const intervalMinutes = config.scheduling.intervalMinutes;
    
    // Convert minutes to cron expression
    // Run every N minutes
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    this.scheduleTask('form-submission', cronExpression, submissionFunction);
  }

  // Schedule a single task to run at a specific time
  scheduleOneTime(name, runTime, taskFunction) {
    const task = cron.schedule(runTime, async () => {
      try {
        console.log(`Running one-time task: ${name}`);
        
        if (!this.checkDailyLimit()) {
          console.log('Daily submission limit reached, skipping task');
          return;
        }
        
        await taskFunction();
        this.incrementSubmissionCount();
        
        // Stop the task after it runs once
        this.stopTask(name);
      } catch (error) {
        console.error(`Error in one-time task ${name}:`, error);
        this.stopTask(name);
      }
    }, {
      scheduled: true,
      timezone: 'America/New_York',
    });

    this.tasks.set(name, task);
    console.log(`Scheduled one-time task ${name} at: ${runTime}`);
  }

  // Stop a specific task
  stopTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      console.log(`Stopped task: ${name}`);
    }
  }

  // Stop all tasks
  stopAllTasks() {
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`Stopped task: ${name}`);
    });
    this.tasks.clear();
  }

  // Get task status
  getTaskStatus() {
    const status = {
      totalTasks: this.tasks.size,
      tasks: [],
      dailyStats: {
        submissions: this.submissionCount,
        limit: this.dailyLimit,
        remaining: this.dailyLimit - this.submissionCount,
        lastReset: this.lastResetDate,
      },
    };

    this.tasks.forEach((task, name) => {
      status.tasks.push({
        name,
        running: task.getStatus() === 'scheduled',
      });
    });

    return status;
  }

  // Create a custom cron expression based on interval
  createCronExpression(intervalMinutes) {
    return `*/${intervalMinutes} * * * *`;
  }

  // Validate cron expression
  validateCronExpression(expression) {
    try {
      return cron.validate(expression);
    } catch (error) {
      return false;
    }
  }
}

module.exports = Scheduler;
