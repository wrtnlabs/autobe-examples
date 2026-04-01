import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

/**
 * Test that a newly created todo with no edits has an empty edit history.
 *
 * This test validates the business rule that edit history entries are only
 * created when existing todos are modified, not during initial creation.
 *
 * Steps:
 * 1. Register a new member account
 * 2. Create a todo with title and optional fields
 * 3. Immediately retrieve the edit history without performing any edits
 * 4. Validate history data array is empty and pagination shows 0 records/pages
 */
export async function test_api_todo_edit_history_empty_for_new_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and create authenticated connection
  const memberAuth: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Create a todo with title and optional fields
  const todo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          started_at: new Date().toISOString(),
          due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } satisfies IMultiUserTodoTodo.ICreate,
      },
    );
  typia.assert(todo);
  // 3. Immediately retrieve edit history without any edit operations
  const historyResponse: IPageIMultiUserTodoTodoEditHistory.ISummary =
    await api.functional.multiUserTodo.member.todos.history.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMultiUserTodoTodoEditHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 4. Validate empty history
  TestValidator.equals(
    "history data array is empty",
    historyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records count",
    historyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    historyResponse.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    () => historyResponse.pagination.current === 1,
  );
}
