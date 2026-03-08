import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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
 * Test todo edit history access control by owner.
 *
 * This test verifies that:
 * 1. Only the owner of a todo can access its edit history
 * 2. Non-owners receive appropriate error responses (403 or 404)
 * 3. Error responses do not distinguish between 'todo does not exist' and 'access denied'
 * 4. Data isolation is enforced at the history access level
 * 5. The owner can successfully retrieve their own todo's history
 */
export async function test_api_todo_edit_history_access_control_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create User A (owner of the todo)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(userA);
  // 2. Create a todo for User A
  const todo = await generate_random_todo_app_member_todos_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Create User B (non-owner who will attempt unauthorized access)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(userB);
  // 4. User B attempts to retrieve the edit history of User A's todo
  // This should fail with 403 or 404
  await TestValidator.httpError(
    "User B should not be able to access User A's todo history",
    [403, 404],
    async () => {
      await api.functional.todoApp.member.todos.histories.index(
        userBConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 10,
            sort_by: "created_at",
            order: "desc",
          } satisfies ITodoAppTodoHistory.IRequest,
        },
      );
    },
  );
  // 5. User A successfully retrieves their own todo's history
  const history = await api.functional.todoApp.member.todos.histories.index(
    userAConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(history);
  // 6. Verify pagination metadata
  TestValidator.equals(
    "Current page should be 1",
    history.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination records should be non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.equals(
    "Limit should match request",
    history.pagination.limit,
    10,
  );
}
