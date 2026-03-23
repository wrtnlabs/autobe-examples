import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_scheduled_tasks_create } from "../../../generate/generate_random_ecommerce_mall_admin_scheduled_tasks_create";
import { prepare_random_ecommerce_mall_scheduled_task } from "../../../prepare/prepare_random_ecommerce_mall_scheduled_task";

export async function test_api_admin_scheduled_task_creation_with_concurrent_policy_deny(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate task data
  const name = RandomGenerator.name();
  const description = RandomGenerator.paragraph();
  const timeout_seconds = typia.random<number>() satisfies number as number;
  const max_retries = typia.random<number>() satisfies number as number;
  const retry_delay_seconds = typia.random<number>() satisfies number as number;
  // 3. Create scheduled task with 'deny' concurrent policy
  const task = await api.functional.ecommerceMall.admin.scheduled_tasks.create(
    adminConnection,
    {
      body: {
        name: name,
        description: description,
        cron_expression: `${typia.random<number>()} ${typia.random<number>()} ${typia.random<number>()} ${typia.random<number>()} ${typia.random<number>()}`,
        timezone: "UTC",
        next_execution_at: new Date(Date.now() + 86400000).toISOString(),
        timeout_seconds: timeout_seconds,
        max_retries: max_retries,
        retry_delay_seconds: retry_delay_seconds,
        concurrent_policy: "deny",
        is_active: true,
        status: "pending",
      } satisfies IEcommerceMallScheduledTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Validate task properties
  TestValidator.equals("name matches", task.name, name);
  TestValidator.equals("description matches", task.description, description);
  TestValidator.predicate(
    "has valid cron expression",
    /^([0-9]|[1-5][0-9]) ([0-9]|1[0-9]|2[0-3]) ([1-9]|[12][0-9]|3[01]) ([1-9]|1[0-2]) ([0-6])$/.test(
      task.cron_expression,
    ),
  );
  TestValidator.equals(
    "concurrent policy is deny",
    task.concurrent_policy,
    "deny",
  );
  TestValidator.equals(
    "timeout seconds matches",
    task.timeout_seconds,
    timeout_seconds,
  );
  TestValidator.equals("max retries matches", task.max_retries, max_retries);
  TestValidator.equals(
    "retry delay seconds matches",
    task.retry_delay_seconds,
    retry_delay_seconds,
  );
  TestValidator.equals("is active", task.is_active, true);
  TestValidator.equals("status is pending", task.status, "pending");
  if (task.timeout_seconds !== null && task.timeout_seconds !== undefined) {
    TestValidator.predicate(
      "has valid timeout",
      task.timeout_seconds >= 1 && task.timeout_seconds <= 86400,
    );
  }
  if (task.max_retries !== null && task.max_retries !== undefined) {
    TestValidator.predicate(
      "has valid max retries",
      task.max_retries >= 0 && task.max_retries <= 10,
    );
  }
  if (task.retry_delay_seconds !== null && task.retry_delay_seconds !== undefined) {
    TestValidator.predicate(
      "has valid retry delay",
      task.retry_delay_seconds >= 0 && task.retry_delay_seconds <= 3600,
    );
  }
}