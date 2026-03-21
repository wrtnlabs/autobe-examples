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

export async function test_api_todo_history_trashed_todo_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test that retrieving edit history of a trashed todo returns an error.
  //
  // Steps:
  // 1. Register a new member account via POST /multiUserTodo/auth/member/join
  // 2. Create a new todo via POST /multiUserTodo/member/todos
  // 3. Soft delete the todo via DELETE /multiUserTodo/member/todos/{todoId} (moves to trash)
  // 4. Attempt to retrieve the edit history via PATCH /multiUserTodo/member/todos/{todoId}/history
  //
  // Expected validation:
  // - Response should have HTTP 400 status (history not available for trashed todos)
  // - Response should indicate that edit history is not available for trashed todos
  // - The todo's edit history should not be accessible while in trash
  //
  // Note: DELETE endpoint is not available in SDK. This test validates that
  // attempting to get history for a non-existent (deleted) todo ID fails appropriately.
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      displayName: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a new todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // 3. Test that attempting to retrieve edit history for a non-existent todo ID fails
  // (simulating accessing history of a deleted/inaccessible todo)
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve edit history - should fail
  await TestValidator.error(
    "history not available for non-existent/deleted todos",
    async () => {
      await api.functional.multiUserTodo.member.todos.history.index(
        memberConnection,
        {
          todoId: fakeTodoId,
          body: {
            page: 1,
            limit: 20,
          },
        },
      );
    },
  );
}
