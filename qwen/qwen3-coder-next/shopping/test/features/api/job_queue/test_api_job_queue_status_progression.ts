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

export async function test_api_job_queue_status_progression(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a pending job queue record
  const job = await api.functional.ecommerceMall.admin.job_queues.create(
    adminConnection,
    {
      body: {
        job_name: "test_status_progression",
        priority: 50,
        max_retries: 3,
      } satisfies IEcommerceMallJobQueue.ICreate,
    },
  );
  typia.assert(job);
  TestValidator.equals("initial status is pending", job.status, "pending");
  TestValidator.equals("initial retry_count is 0", job.retry_count, 0);
  // 3. Transition to processing state
  const processingJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: job.id,
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
  TestValidator.predicate(
    "started_at is set",
    processingJob.started_at !== null,
  );
  // 4. Transition to completed state
  const completedJob =
    await api.functional.ecommerceMall.admin.job_queues.update(
      adminConnection,
      {
        jobQueueId: job.id,
        body: {
          status: "completed",
          finished_at: new Date().toISOString(),
        } satisfies IEcommerceMallJobQueue.IUpdate,
      },
    );
  typia.assert(completedJob);
  TestValidator.equals(
    "status changed to completed",
    completedJob.status,
    "completed",
  );
  TestValidator.predicate(
    "finished_at is set",
    completedJob.finished_at !== null,
  );
  TestValidator.predicate(
    "started_at remains set",
    completedJob.started_at !== null,
  );
}
