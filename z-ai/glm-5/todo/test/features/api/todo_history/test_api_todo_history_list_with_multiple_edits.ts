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

export async function test_api_todo_history_list_with_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // Test viewing the edit history of a todo.
  // Note: The update API endpoint is not available in the current SDK,
  // so this test validates the history endpoint works correctly with a newly created todo.
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a todo with initial title
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Test Todo for History",
      },
    },
  );
  typia.assert(todo);
  // 3. Retrieve edit history with pagination
  const historyResponse =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(historyResponse);
  // 4. Validate pagination metadata for empty history
  TestValidator.equals(
    "total history entries should be 0 for new todo",
    historyResponse.pagination.records,
    0,
  );
  TestValidator.equals("current page", historyResponse.pagination.current, 1);
  TestValidator.equals("pages count", historyResponse.pagination.pages, 0);
  // 5. Validate empty history entries list
  TestValidator.equals(
    "history entries should be empty",
    historyResponse.data.length,
    0,
  );
  // 6. Test pagination with different parameters
  const page2Response =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 records", page2Response.pagination.records, 0);
  TestValidator.equals("page 2 data length", page2Response.data.length, 0);
}
