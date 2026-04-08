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
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test that a member cannot permanently delete another user's todo from trash.
 *
 * Validates the data isolation business rule by attempting to permanently delete a todo belonging to a different user. The test creates two separate member accounts, has the first member create and soft delete a todo, then attempts to permanently delete it from the second member's session.
 *
 * This ensures that the trash endpoint properly validates todo ownership before allowing permanent deletion, preventing cross-user data access violations.
 *
 * 1. Member A authenticates via join endpoint.
 * 2. Member A creates a todo with a title.
 * 3. Member A soft deletes the todo to trash.
 * 4. Member B authenticates via join endpoint (separate session).
 * 5. Member B attempts to permanently delete Member A's todo from trash.
 * 6. Verifies the operation fails with 404 Not Found error.
 */
export async function test_api_todo_permanent_delete_another_user_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create a todo as Member A
  const todo = await api.functional.todoApp.member.todos.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Soft delete the todo to trash as Member A
  await api.functional.todoApp.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // 4. Authenticate as Member B (separate session)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B attempts to permanently delete Member A's todo from trash
  // 6. Verify the operation fails with 404 Not Found
  await TestValidator.httpError(
    "cannot permanently delete another user's todo from trash",
    404,
    async () => {
      await api.functional.todoApp.member.todos.trash.erase(memberBConnection, {
        todoId: todo.id,
      });
    },
  );
}
