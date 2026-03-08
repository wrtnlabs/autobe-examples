import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function test_api_todo_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create multiple todo items with various configurations
  const completedTodos = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_todo_app_member_todos_create(memberConnection, {
        body: {
          title: `Completed Todo ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          start_date: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          due_date: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 60,
          ).toISOString(),
        } satisfies ITodoAppTodo.ICreate,
      }),
    ),
  );
  const incompleteTodos = await Promise.all(
    ArrayUtil.repeat(4, () =>
      generate_random_todo_app_member_todos_create(memberConnection, {
        body: {
          title: `Incomplete Todo ${RandomGenerator.alphabets(4)}`,
          description: null,
          start_date: null,
          due_date: null,
        } satisfies ITodoAppTodo.ICreate,
      }),
    ),
  );
  const mixedTodos = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_todo_app_member_todos_create(memberConnection, {
        body: {
          title: `Mixed Todo ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          start_date: typia.random<
            (string & tags.Format<"date-time">) | null
          >(),
          due_date: typia.random<(string & tags.Format<"date-time">) | null>(),
        } satisfies ITodoAppTodo.ICreate,
      }),
    ),
  );
  const allTodos = [...completedTodos, ...incompleteTodos, ...mixedTodos];
  // 3. Retrieve todo list with default parameters
  const response = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 4. Verify response structure
  TestValidator.equals(
    "has pagination",
    response.pagination.records,
    allTodos.length,
  );
  TestValidator.equals("has data array", response.data.length, allTodos.length);
  // Verify each todo exists in response
  for (const todo of allTodos) {
    const found = response.data.find(
      (item: ITodoAppTodo.ISummary) => item.id === todo.id,
    );
    TestValidator.predicate(
      "todo found in response",
      () => found !== undefined,
    );
    if (found !== undefined) {
      typia.assert(found!);
      TestValidator.equals("todo id matches", found.id, todo.id);
      TestValidator.equals("todo title matches", found.title, todo.title);
      TestValidator.equals(
        "todo is_complete matches",
        found.is_complete,
        todo.is_complete,
      );
      TestValidator.equals(
        "todo created_at matches",
        found.created_at,
        todo.created_at,
      );
    }
  }
  // 5. Verify sorting (newest first by default)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        "todos sorted by creation date (newest first)",
        () =>
          new Date(response.data[i].created_at) <=
          new Date(response.data[i - 1].created_at),
      );
    }
  }
}
