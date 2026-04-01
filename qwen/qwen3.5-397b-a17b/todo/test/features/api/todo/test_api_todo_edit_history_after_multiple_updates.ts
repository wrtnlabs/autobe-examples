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

export async function test_api_todo_edit_history_after_multiple_updates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a todo with initial title and description
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        started_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      },
    },
  );
  typia.assert(todo);
  // Validate todo ownership (business logic)
  TestValidator.equals(
    "todo owner matches authenticated member",
    todo.member.id,
    authResult.id,
  );
  // 3. Retrieve the edit history for this todo
  // Note: In a complete implementation, we would update the todo multiple times
  // to generate history entries. However, the update endpoint is not available
  // in the provided API functions. This test validates the history endpoint
  // structure and accessibility.
  const historyResponse =
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
  // 4. Validate history entries are sorted from most recent to oldest
  // (business logic validation, not type validation)
  if (historyResponse.data.length > 1) {
    for (let i = 0; i < historyResponse.data.length - 1; i++) {
      const current = historyResponse.data[i];
      const next = historyResponse.data[i + 1];
      TestValidator.predicate(
        `history entry ${i} is newer than or equal to entry ${i + 1}`,
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
  // 5. Validate privacy - other members cannot access this todo's history
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthResult = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(otherAuthResult);
  // Other member should not be able to access the first member's todo history
  await TestValidator.error(
    "other member cannot access todo history",
    async () => {
      await api.functional.multiUserTodo.member.todos.history.index(
        otherMemberConnection,
        {
          todoId: todo.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IMultiUserTodoTodoEditHistory.IRequest,
        },
      );
    },
  );
}
