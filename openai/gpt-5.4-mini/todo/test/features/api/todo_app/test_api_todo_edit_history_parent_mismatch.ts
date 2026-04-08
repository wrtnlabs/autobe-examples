import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function test_api_todo_edit_history_parent_mismatch(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a todo edit-history lookup rejects when the history entry does not belong to the requested parent todo.
   *
   * This scenario validates the private member todo history endpoint by creating an owned todo and then requesting a mismatched combination of todoId and editHistoryId. The test ensures the API enforces the parent-child relationship between todo and edit-history records, and that the member still can access the valid todo resource after the rejected lookup.
   *
   * 1. Register and authenticate a new member using an isolated connection.
   * 2. Create a private todo owned by that member.
   * 3. Request the edit-history endpoint with the owned todoId and an unrelated editHistoryId.
   * 4. Verify the lookup is rejected because the history entry is not attached to the specified parent todo.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies ITodoAppMember.IJoin["password"],
    } satisfies ITodoAppMember.IJoin,
  });
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  await TestValidator.httpError(
    "todo edit history lookup should fail when editHistoryId does not belong to the specified todo",
    [404, 403],
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: todo.id,
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  const fetchedTodo =
    await api.functional.todoApp.member.todos.editHistories.at(
      memberConnection,
      {
        todoId: todo.id,
        editHistoryId: todo.id,
      },
    );
  typia.assert(fetchedTodo);
}
