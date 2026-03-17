import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test attempt to delete a todo that does not exist. After authenticating as a member,
 * call the delete endpoint with a non-existent todo ID (random UUID).
 * Verify the system returns a 404 Not Found error, indicating the todo cannot be found.
 * Ensure no side effects occur in the database.
 */
export async function test_api_todo_soft_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Generate a random UUID that doesn't exist in the system
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent todo and expect 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () => {
      await api.functional.todoApp.member.todos.erase(memberConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
