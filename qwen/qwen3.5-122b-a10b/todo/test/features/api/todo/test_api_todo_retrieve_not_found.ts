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
 * Test retrieving a non-existent todo returns 404 Not Found.
 *
 * Validates that attempting to retrieve a todo with a non-existent UUID returns an appropriate 404 error response. This test ensures proper error handling for invalid todo identifiers and confirms that the API correctly distinguishes between missing resources and authorization failures.
 *
 * 1. Authenticate as member using join endpoint.
 * 2. Generate a random UUID that does not correspond to any existing todo.
 * 3. Attempt to retrieve the todo using the non-existent UUID.
 * 4. Validate that the API returns 404 Not Found error.
 */
export async function test_api_todo_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // 2. Generate non-existent UUID
  const nonExistentTodoId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent todo and validate 404 error
  await TestValidator.httpError(
    "retrieve non-existent todo returns 404",
    404,
    async () => {
      await api.functional.todoApp.member.todos.at(memberConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
