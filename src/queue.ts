import { QRJob, GetJobFromQueueResponse, DeleteQueueMessageResponse } from "./types";
import assert from "assert";

const {
  QUEUE_URL,
  QUEUE_NAME,
  QUEUE_API_KEY,
  QUEUE_API_KEY_HEADER = "Benchmark-Api-Key",
  EAGER_NUMBER = "2"
} = process.env;

assert(QUEUE_URL, "QUEUE_URL is not defined");
assert(QUEUE_NAME, "QUEUE_NAME is not defined");
assert(QUEUE_API_KEY, "QUEUE_API_KEY is not defined");
assert(QUEUE_API_KEY_HEADER, "QUEUE_API_KEY_HEADER is not defined");

const eagerNumber = parseInt(EAGER_NUMBER);

const headers = {
  [QUEUE_API_KEY_HEADER]: QUEUE_API_KEY
};


async function _getJob(): Promise<{ messageId: string, job: QRJob } | null> {
  const url = new URL("/" + QUEUE_NAME, QUEUE_URL);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: headers
  });

  const queueMessage = await res.json() as GetJobFromQueueResponse;

  if (queueMessage.messages?.length) {
    const job = JSON.parse(queueMessage.messages[0].body) as QRJob;
    return { messageId: queueMessage.messages[0].messageId, job };
  }
  return null;
}

/**
 * Deletes a message from the queue, indicating it does not need to be processed again.
 * @param messageId The id of the message to delete from the queue
 * @returns 
 */
export async function markJobComplete(messageId: string): Promise<DeleteQueueMessageResponse> {
  const url = new URL(`/${QUEUE_NAME}/${encodeURIComponent(messageId)}`, QUEUE_URL);
  const response = await fetch(url.toString(), {
    method: "DELETE",
    headers,
  });
  const json = await response.json() as DeleteQueueMessageResponse;

  return json;
}

const queue: { messageId: string, job: QRJob }[] = [];
export async function getJob(): Promise<{ messageId: string, job: QRJob } | null> {
  
  if (queue.length) {
    const job = queue.shift();
    if (job) {
      fillQueue();
      return job;
    }
  }
  const job = await _getJob();
  if (job) {
    return job;
  }
  return null;
}

export async function fillQueue() {
  const jobs = await Promise.all(Array(eagerNumber - queue.length).fill(0).map(() => _getJob()));
  jobs.forEach((job) => {
    if (job) {
      queue.push(job);
    }
  });
}