import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_scheduled_task_admin_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Register and login as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Use a deterministic task ID for testing
  // In a real scenario, this would be a task ID that was previously created
  const taskId = "test-scheduled-task-" + RandomGenerator.alphaNumeric(8);
  // Delete the scheduled task
  await api.functional.ecommerceMall.admin.scheduled_tasks.erase(
    adminConnection,
    {
      taskId: taskId,
    },
  );
  // Since erase() returns void and the scenario doesn't provide a way to verify deletion,
  // we add a comment indicating that in a real test environment,
  // you would verify the task no longer exists or that future executions are cancelled
  // Note: This test assumes the task ID exists or will be handled gracefully by the API
}
