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

export async function test_api_job_queue_invalid_transitions(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // 1. Create and complete a job, then attempt to process it again
  const completedJob =
    await api.functional.ecommerceMall.admin.job_queues.create(
      adminConnection,
      {
        body: {
          job_name: "test_completed_job",
          priority: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallJobQueue.ICreate,
      },
    );
  typia.assert(completedJob);
  // Mark job as processing
  let updatedJob = await api.functional.ecommerceMall.admin.job_queues.update(
    adminConnection,
    {
      jobQueueId: completedJob.id,
      body: {
        status: "processing",
        started_at: new Date().toISOString(),
      } satisfies IEcommerceMallJobQueue.IUpdate,
    },
  );
  typia.assert(updatedJob);
  // Mark job as completed
  updatedJob = await api.functional.ecommerceMall.admin.job_queues.update(
    adminConnection,
    {
      jobQueueId: completedJob.id,
      body: {
        status: "completed",
        finished_at: new Date().toISOString(),
      } satisfies IEcommerceMallJobQueue.IUpdate,
    },
  );
  typia.assert(updatedJob);
  // Attempt to process completed job (should fail - business logic)
  await TestValidator.error("cannot process completed job", async () => {
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: completedJob.id,
        body: {
          status: "processing",
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  });
  // 2. Create a job with max_retries=2, exhaust retries, then attempt retry
  const exhaustedJob =
    await api.functional.ecommerceMall.admin.job_queues.create(
      adminConnection,
      {
        body: {
          job_name: "test_exhausted_job",
          priority: 5,
          max_retries: 2,
        } satisfies IEcommerceMallJobQueue.ICreate,
      },
    );
  typia.assert(exhaustedJob);
  // Exhaust all retries
  for (let i = 0; i < 2; i++) {
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: exhaustedJob.id,
        body: {
          status: "failed",
          retry_count: i + 1,
          last_error: `Attempt ${i + 1} failed`,
          finished_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  }
  // Attempt to retry beyond max_retries (should fail - business logic)
  await TestValidator.error("cannot retry beyond max_retries", async () => {
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: exhaustedJob.id,
        body: {
          status: "processing",
          retry_count: 3,
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  });
  // 3. Create a failed job with max_retries=0, attempt to retry
  const noRetryJob = await api.functional.ecommerceMall.admin.job_queues.create(
    adminConnection,
    {
      body: {
        job_name: "test_no_retry_job",
        priority: 10,
        max_retries: 0,
      } satisfies IEcommerceMallJobQueue.ICreate,
    },
  );
  typia.assert(noRetryJob);
  // Mark job as failed
  await api.functional.ecommerceMall.admin.job_queues.update(adminConnection, {
    jobQueueId: noRetryJob.id,
    body: {
      status: "failed",
      retry_count: 0,
      last_error: "First failure",
      finished_at: new Date().toISOString(),
    } satisfies IEcommerceMallJobQueue.IUpdate,
  });
  // Attempt to retry job when max_retries=0 (should fail - business logic)
  await TestValidator.error("cannot retry with max_retries=0", async () => {
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: noRetryJob.id,
        body: {
          status: "processing",
          retry_count: 1,
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  });
  // Verify valid transitions still work
  const pendingJob = await api.functional.ecommerceMall.admin.job_queues.create(
    adminConnection,
    {
      body: {
        job_name: "test_valid_transition",
        priority: 20,
        max_retries: 3,
      } satisfies IEcommerceMallJobQueue.ICreate,
    },
  );
  typia.assert(pendingJob);
  // Valid: pending -> processing
  const processingJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: pendingJob.id,
        body: {
          status: "processing",
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(processingJob);
  TestValidator.equals(
    "status changed to processing",
    processingJob.status,
    "processing",
  );
  // Valid: processing -> failed (when retries remain)
  const failedAgainJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: pendingJob.id,
        body: {
          status: "failed",
          retry_count: 1,
          last_error: "Second failure",
          finished_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(failedAgainJob);
  TestValidator.equals(
    "status changed to failed",
    failedAgainJob.status,
    "failed",
  );
  TestValidator.equals(
    "retry_count incremented",
    failedAgainJob.retry_count,
    1,
  );
  // Valid: failed -> processing (when retries remain)
  const reprocessedJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: pendingJob.id,
        body: {
          status: "processing",
          started_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(reprocessedJob);
  TestValidator.equals(
    "status changed to processing again",
    reprocessedJob.status,
    "processing",
  );
}
