import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the normal workflow where a user initiates trash cleanup with expired items.
 * Since the actual todo creation API returns void and we cannot get created todo IDs,
 * this test focuses on validating the cleanup operation itself with proper authorization.
 */
export async function test_api_trash_cleanup_now_normal_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user using the available utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // 2. Create todos (API returns void, so we can't track individual todos)
  // Since we can't get todo IDs from creation, we focus on testing the cleanup operation
  await api.functional.todoApp.user.todos.create(userConnection);
  await api.functional.todoApp.user.todos.create(userConnection);
  // 3. Call cleanup operation directly
  // Note: Without todo IDs from creation, we cannot test soft deletion
  // This test validates that cleanup can be initiated by an authorized user
  const cleanupResult =
    await api.functional.todoApp.user.trash.cleanup.now.cleanupNow(
      userConnection,
    );
  typia.assert(cleanupResult);
  // 4. Validate cleanup response structure
  TestValidator.predicate(
    "items processed should be non-negative",
    cleanupResult.items_processed >= 0,
  );
  TestValidator.predicate(
    "items deleted should be non-negative",
    cleanupResult.items_deleted >= 0,
  );
  TestValidator.predicate(
    "items deleted should not exceed items processed",
    cleanupResult.items_deleted <= cleanupResult.items_processed,
  );
  // Error message can be null (success) or contain error details
  if (cleanupResult.error_message !== null) {
    TestValidator.predicate(
      "error message should be a string",
      typeof cleanupResult.error_message === "string",
    );
  }
  // Completed timestamp should be set if operation finished
  if (cleanupResult.completed_at !== null) {
    TestValidator.predicate(
      "completed at should be valid date string",
      typeof cleanupResult.completed_at === "string" &&
        cleanupResult.completed_at.length > 0,
    );
  }
}
