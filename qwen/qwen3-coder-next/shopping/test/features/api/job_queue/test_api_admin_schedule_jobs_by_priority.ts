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

export async function test_api_admin_schedule_jobs_by_priority(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Create a low priority job (priority: 10)
  const lowPriorityJob =
    await api.functional.ecommerceMall.admin.job_queues.create(
      adminConnection,
      {
        body: {
          job_name: "low_priority_task",
          priority: 10,
          max_retries: 3,
        } satisfies IEcommerceMallJobQueue.ICreate,
      },
    );
  typia.assert(lowPriorityJob);
  TestValidator.equals("low priority value", lowPriorityJob.priority, 10);
  // Create a high priority job (priority: 90)
  const highPriorityJob =
    await api.functional.ecommerceMall.admin.job_queues.create(
      adminConnection,
      {
        body: {
          job_name: "high_priority_task",
          priority: 90,
          max_retries: 5,
        } satisfies IEcommerceMallJobQueue.ICreate,
      },
    );
  typia.assert(highPriorityJob);
  TestValidator.equals("high priority value", highPriorityJob.priority, 90);
  // Verify that both jobs are created with correct priorities
  TestValidator.predicate(
    "high priority > low priority",
    () => highPriorityJob.priority > lowPriorityJob.priority,
  );
}
