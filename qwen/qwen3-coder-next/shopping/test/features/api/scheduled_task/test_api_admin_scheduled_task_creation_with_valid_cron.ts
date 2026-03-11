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

export async function test_api_admin_scheduled_task_creation_with_valid_cron(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create scheduled task with valid cron expression
  const taskName = RandomGenerator.name();
  const now = new Date().toISOString();
  const task = await api.functional.ecommerceMall.admin.scheduled_tasks.create(
    adminConnection,
    {
      body: {
        name: taskName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        cron_expression: `0 0 * * *`, // Every day at midnight
        timezone: "UTC",
        next_execution_at: now,
        concurrent_policy: "allow" as const,
        is_active: true,
        status: "pending" as const,
        last_execution_status: null,
        success_count: 0,
        failure_count: 0,
      } satisfies IEcommerceMallScheduledTask.ICreate,
    },
  );
  typia.assert(task);
  // 3. Validate task creation response
  TestValidator.equals("task name matches", task.name, taskName);
  TestValidator.equals(
    "cron expression matches",
    task.cron_expression,
    "0 0 * * *",
  );
  TestValidator.equals(
    "concurrent policy is allow",
    task.concurrent_policy,
    "allow",
  );
  TestValidator.equals("status is pending", task.status, "pending");
  TestValidator.equals("is active", task.is_active, true);
  TestValidator.equals("timezone is UTC", task.timezone, "UTC");
  TestValidator.equals("success count is 0", task.success_count, 0);
  TestValidator.equals("failure count is 0", task.failure_count, 0);
  TestValidator.equals(
    "last execution status is null",
    task.last_execution_status,
    null,
  );
  TestValidator.predicate(
    "has valid next execution at",
    Boolean(task.next_execution_at),
  );
  TestValidator.predicate("has valid created at", Boolean(task.created_at));
  TestValidator.predicate("has valid updated at", Boolean(task.updated_at));
  TestValidator.predicate(
    "has valid uuid id",
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
      task.id,
    ),
  );
}
