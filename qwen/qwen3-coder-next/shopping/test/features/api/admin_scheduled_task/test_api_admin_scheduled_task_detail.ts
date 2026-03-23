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

export async function test_api_admin_scheduled_task_detail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Retrieve a scheduled task
  const task = await api.functional.ecommerceMall.admin.scheduled_tasks.at(
    adminConnection,
    {
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(task);
  // 3. Validate response structure
  TestValidator.equals("task has id", typeof task.id, "string");
  TestValidator.predicate("task id is uuid", /^[0-9a-f-]{36}$/i.test(task.id));
  TestValidator.equals("task has name", typeof task.name, "string");
  TestValidator.equals(
    "task has cron_expression",
    typeof task.cron_expression,
    "string",
  );
  TestValidator.equals(
    "task has next_execution_at",
    typeof task.next_execution_at,
    "string",
  );
  TestValidator.predicate(
    "next_execution_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      task.next_execution_at,
    ),
  );
  TestValidator.equals("task has created_at", typeof task.created_at, "string");
  TestValidator.equals("task has updated_at", typeof task.updated_at, "string");
  TestValidator.equals(
    "task has success_count",
    typeof task.success_count,
    "number",
  );
  TestValidator.equals(
    "task has failure_count",
    typeof task.failure_count,
    "number",
  );
}
