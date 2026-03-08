import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

export async function test_api_todo_edit_history_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a todo (memberConnection already has token from authorize_member_join)
  const todo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString(),
        due_date: RandomGenerator.date(
          new Date(new Date().getTime() + 1000 * 60 * 60 * 24),
          1000 * 60 * 60 * 24 * 14,
        ).toISOString(),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Edit todo to create history entry
  const editedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        is_complete: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(editedTodo);
  // 4. Generate a history ID that does NOT exist in the database
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve a non-existent history entry
  await TestValidator.error("non-existent history returns 404", async () => {
    await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
      memberConnection,
      {
        todoId: todo.id,
        historyId: nonExistentHistoryId,
      },
    );
  });
  // 6. Test with invalid UUID format
  await TestValidator.error("invalid UUID format returns 404", async () => {
    await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
      memberConnection,
      {
        todoId: todo.id,
        historyId: "invalid-uuid-format",
      },
    );
  });
  // 7. Test with empty string
  await TestValidator.error("empty historyId returns 404", async () => {
    await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
      memberConnection,
      {
        todoId: todo.id,
        historyId: "",
      },
    );
  });
  // 8. Verify that existing todo still works (to ensure auth and todo access is valid)
  const retrievedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todo.id,
      body: { is_complete: false } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(retrievedTodo);
  TestValidator.equals("todo ownership still valid", retrievedTodo.id, todo.id);
}