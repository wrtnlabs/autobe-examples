import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to retrieve a non-existent todo returns a 404 error.
 *
 * Validates proper error handling when accessing a todo with a valid UUID format that doesn't exist in the database. Ensures the API returns appropriate error responses for missing resources.
 *
 * 1. Authenticate a new member account
 * 2. Generate a valid UUID that doesn't exist in the database
 * 3. Attempt to retrieve the non-existent todo
 * 4. Verify the API throws a 404 Not Found error
 */
export async function test_api_todo_detail_retrieve_non_existent_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate non-existent UUID
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent todo and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () =>
      await api.functional.todoApp.member.todos.at(memberConnection, {
        todoId: nonExistentTodoId,
      }),
  );
}
