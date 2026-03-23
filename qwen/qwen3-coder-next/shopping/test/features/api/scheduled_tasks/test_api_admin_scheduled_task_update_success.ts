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

export async function test_api_admin_scheduled_task_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() + "@admin.test",
      password: "Test1234!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Create a scheduled task with minimal required fields for the test
  const newTask: IEcommerceMallScheduledTask = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    cron_expression: "0 0 * * *",
    timezone: "Asia/Seoul",
    next_execution_at: new Date().toISOString(),
    timeout_seconds: 300,
    max_retries: 3,
    retry_delay_seconds: 10,
    concurrent_policy: "allow",
    is_active: true,
    status: "pending",
    last_execution_status: null,
    last_execution_start_at: null,
    last_execution_end_at: null,
    last_execution_duration_seconds: null,
    last_execution_error: null,
    success_count: 0,
    failure_count: 0,
    last_failed_reason: null,
    last_failed_retry_count: null,
    created_by: null,
    updated_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Step 3: Update the task as regular admin
  const updatedTask =
    await api.functional.ecommerceMall.admin.scheduled_tasks.update(
      adminConnection,
      {
        taskId: newTask.id,
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          cron_expression: "0 6 * * 1",
          timezone: "Asia/Seoul",
          timeout_seconds: 600,
          max_retries: 5,
          retry_delay_seconds: 15,
          concurrent_policy: "cancel",
          is_active: false,
        } satisfies IEcommerceMallScheduledTask.IUpdate,
      },
    );
  typia.assert(updatedTask);
  // Step 4: Validate ID preserved
  TestValidator.equals("task ID preserved", updatedTask.id, newTask.id);
  // Step 5: Validate execution metrics preserved
  TestValidator.equals(
    "success_count preserved",
    updatedTask.success_count,
    newTask.success_count,
  );
  TestValidator.equals(
    "failure_count preserved",
    updatedTask.failure_count,
    newTask.failure_count,
  );
  // Step 6: Validate status preserved
  TestValidator.equals("status preserved", updatedTask.status, newTask.status);
}
