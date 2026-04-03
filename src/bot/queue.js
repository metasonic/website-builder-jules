class TaskQueue {
    constructor(concurrencyLimit) {
        this.limit = concurrencyLimit;
        this.running = 0;
        this.queue = [];
    }

    /**
     * Adds a task to the queue.
     * @param {Function} task - A function returning a Promise.
     * @returns {Promise} Resolves when the task is completed.
     */
    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task,
                resolve,
                reject
            });
            this.processQueue();
        });
    }

    processQueue() {
        if (this.running >= this.limit || this.queue.length === 0) {
            return;
        }

        const { task, resolve, reject } = this.queue.shift();
        this.running++;

        task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.running--;
                this.processQueue();
            });
    }

    getQueuePosition() {
        return this.queue.length;
    }
}

module.exports = { TaskQueue };