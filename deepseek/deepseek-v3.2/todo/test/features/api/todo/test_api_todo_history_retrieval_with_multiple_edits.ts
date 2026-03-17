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

export async function test_api_todo_history_retrieval_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Create initial todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Perform sequential edits
  const editOperations = [
    {
      type: "title_update",
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
    {
      type: "description_add",
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }), // Keep title required
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoAppTodo.ICreate,
    },
    {
      type: "due_date_set",
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }), // Keep title required
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } satisfies ITodoAppTodo.ICreate,
    },
    {
      type: "complete",
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }), // Keep title required
        // Removed 'completed' property since it doesn't exist in ICreate type
      } satisfies ITodoAppTodo.ICreate,
    },
  ];
  for (const operation of editOperations) {
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: operation.body,
    });
  }
  // 4. Retrieve history with default parameters
  const historyResponse =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {} satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate response
  TestValidator.equals(
    "total history records",
    historyResponse.pagination.records,
    editOperations.length + 1,
  );
  TestValidator.predicate(
    "history data array exists",
    Array.isArray(historyResponse.data),
  );
  TestValidator.equals(
    "correct number of history entries",
    historyResponse.data.length,
    Math.min(editOperations.length + 1, 10),
  );
  // 6. Validate chronological order (most recent first)
  for (let i = 1; i < historyResponse.data.length; i++) {
    const current = new Date(historyResponse.data[i].created_at);
    const previous = new Date(historyResponse.data[i - 1].created_at);
    TestValidator.predicate(
      `history entry ${i} is earlier than ${i - 1}`,
      current <= previous,
    );
  }
  // 7. Validate each history entry
  for (const history of historyResponse.data) {
    typia.assert(history);
    TestValidator.equals("todo reference matches", history.todo.id, todo.id);
    TestValidator.equals(
      "member reference matches",
      history.member.id,
      authorizedMember.id,
    );
    TestValidator.predicate(
      "history has description",
      typeof history.description === "string" && history.description.length > 0,
    );
  }
}
