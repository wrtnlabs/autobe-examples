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

/**
 * Test todo list edge cases including empty search criteria, no-matching criteria,
 * invalid date ranges, and ownership validation.
 */
export async function test_api_todo_list_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create multiple todos for the member
  const todoCount = 3;
  const createdTodos: ITodoAppTodo[] = [];
  await ArrayUtil.asyncRepeat(todoCount, async (index) => {
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      {
        body: {
          title: `Todo ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          start_date: new Date(
            Date.now() + 86400000 * (index + 1),
          ).toISOString(), // tomorrow + index
          due_date: new Date(Date.now() + 86400000 * (index + 2)).toISOString(), // day after tomorrow + index
        },
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  });
  // 3. Test empty search criteria (should return all todos)
  const emptySearch = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return all created todos",
    emptySearch.data.length,
    todoCount,
  );
  // Verify each todo belongs to the authenticated member
  for (const todo of emptySearch.data) {
    TestValidator.equals(
      "todo should belong to authenticated member",
      todo.member.id,
      member.id,
    );
  }
  // 4. Test search with no matching criteria
  const nonMatchingSearch = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: "ThisTextWillNeverMatchAnyTodo123456",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching search should return empty results",
    nonMatchingSearch.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search should have zero total records",
    nonMatchingSearch.pagination.records,
    0,
  );
  // 5. Test invalid date range (start after end)
  await TestValidator.error(
    "invalid date range should throw error",
    async () => {
      await api.functional.todoApp.member.todos.index(memberConnection, {
        body: {
          start_date_range: {
            start: new Date(Date.now() + 86400000 * 2).toISOString(), // day after tomorrow
            end: new Date(Date.now() - 86400000).toISOString(), // yesterday
          },
        } satisfies ITodoAppTodo.IRequest,
      });
    },
  );
  // 6. Test ownership - create another member and verify they don't see first member's todos
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(anotherMember);
  // Another member searches with empty criteria
  const anotherMemberSearch = await api.functional.todoApp.member.todos.index(
    anotherMemberConnection,
    {
      body: {} satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(anotherMemberSearch);
  TestValidator.equals(
    "another member should see zero todos (none created for them)",
    anotherMemberSearch.data.length,
    0,
  );
  TestValidator.equals(
    "another member should have zero total records",
    anotherMemberSearch.pagination.records,
    0,
  );
}
