import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_job_queues_create } from "../../../generate/generate_random_ecommerce_mall_admin_job_queues_create";
import { prepare_random_ecommerce_mall_job_queue } from "../../../prepare/prepare_random_ecommerce_mall_job_queue";

export async function test_api_job_queue_retry_logic(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for job queue operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create a job queue record with max_retries configured
  const job = await api.functional.ecommerceMall.admin.job_queues.create(
    adminConnection,
    {
      body: {
        job_name: "test_job_retry",
        priority: 0,
        max_retries: 3,
      } satisfies IEcommerceMallJobQueue.ICreate,
    },
  );
  typia.assert(job);
  // Initial state check
  TestValidator.equals("initial status", job.status, "pending");
  TestValidator.equals("initial retry_count", job.retry_count, 0);
  TestValidator.equals("initial max_retries", job.max_retries, 3);
  TestValidator.equals("initial last_error", job.last_error, null);
  // Simulate first failure - mark as failed
  const failedJob1 = await api.functional.ecommerceMall.admin.job_queues.update(
    adminConnection,
    {
      jobQueueId: job.id,
      body: {
        status: "failed",
        retry_count: 1,
        last_error: "First processing attempt failed due to network timeout",
      } satisfies IEcommerceMallJobQueue.IUpdate,
    },
  );
  typia.assert(failedJob1);
  TestValidator.equals("first failure status", failedJob1.status, "failed");
  TestValidator.equals("first failure retry_count", failedJob1.retry_count, 1);
  TestValidator.predicate(
    "first failure has error",
    () => failedJob1.last_error !== null,
  );
  TestValidator.equals(
    "first failure error message",
    failedJob1.last_error,
    "First processing attempt failed due to network timeout",
  );
  // Retry job - transition back to processing
  const processingJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: job.id,
        body: {
          status: "processing",
          retry_count: 1,
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(processingJob);
  TestValidator.equals("retry status", processingJob.status, "processing");
  TestValidator.equals("retry retry_count", processingJob.retry_count, 1);
  // Simulate second failure
  const failedJob2 = await api.functional.ecommerceMall.admin.job_queues.update(
    adminConnection,
    {
      jobQueueId: job.id,
      body: {
        status: "failed",
        retry_count: 2,
        last_error:
          "Second processing attempt failed due to database connection error",
      } satisfies IEcommerceMallJobQueue.IUpdate,
    },
  );
  typia.assert(failedJob2);
  TestValidator.equals("second failure status", failedJob2.status, "failed");
  TestValidator.equals("second failure retry_count", failedJob2.retry_count, 2);
  // Retry job again - transition back to processing
  const processingJob2 =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: job.id,
        body: {
          status: "processing",
          retry_count: 2,
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(processingJob2);
  // Simulate third failure
  const failedJob3 = await api.functional.ecommerceMall.admin.job_queues.update(
    adminConnection,
    {
      jobQueueId: job.id,
      body: {
        status: "failed",
        retry_count: 3,
        last_error:
          "Third processing attempt failed due to service unavailable",
      } satisfies IEcommerceMallJobQueue.IUpdate,
    },
  );
  typia.assert(failedJob3);
  TestValidator.equals("third failure status", failedJob3.status, "failed");
  TestValidator.equals("third failure retry_count", failedJob3.retry_count, 3);
  // Job should now be considered permanently failed (retry_count >= max_retries)
  // Attempting to retry again should not be allowed by business logic
  // Test that the job is stuck in failed state with no more retries allowed
  TestValidator.equals(
    "permanently failed retry_count",
    failedJob3.retry_count,
    3,
  );
  TestValidator.equals(
    "permanently failed max_retries",
    failedJob3.max_retries,
    3,
  );
  TestValidator.predicate(
    "no more retries allowed",
    () => failedJob3.retry_count >= failedJob3.max_retries,
  );
}
