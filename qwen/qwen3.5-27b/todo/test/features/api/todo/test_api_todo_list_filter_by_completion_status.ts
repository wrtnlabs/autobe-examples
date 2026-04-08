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
 * Test that a member can filter their todos by completion status (all, complete, or incomplete).
 *
 * Validates the filtering functionality of the todo list API by testing all three completion status filter options. The test creates multiple todos and verifies that filtering correctly returns only the expected subset of todos based on completion status.
 *
 * Special attention is given to ensuring that the filter is applied correctly with pagination and sorting, and that the pagination metadata reflects the filtered count rather than the total count. Since todos are created as incomplete by default and there's no update API available in this test, the test focuses on verifying that the completion_status=false filter returns all created todos, while completion_status=true returns an empty list.
 *
 * 1. Register a new member account.
 * 2. Create several todo items (all created as incomplete by default).
 * 3. Test filtering with completion_status=null to get all todos.
 * 4. Test filtering with completion_status=true to verify empty result (no complete todos).
 * 5. Test filtering with completion_status=false to get all incomplete todos.
 * 6. Verify filtering works correctly with sorting and pagination.
 */
export async function test_api_todo_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create several todo items (all created as incomplete by default)
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "First todo - incomplete",
        description: "This todo should remain incomplete",
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Second todo - incomplete",
        description: "This todo should also remain incomplete",
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Third todo - incomplete",
        description: "This todo remains incomplete",
      },
    },
  );
  typia.assert(todo3);
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Fourth todo - incomplete",
        description: "This todo also remains incomplete",
      },
    },
  );
  typia.assert(todo4);
  // 3. Test filtering with completion_status=null to get all todos
  const allTodos = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completion_status: null,
        limit: 100,
      },
    },
  );
  typia.assert(allTodos);
  TestValidator.equals("all todos count", allTodos.data.length, 4);
  TestValidator.equals(
    "all todos pagination records",
    allTodos.pagination.records,
    4,
  );
  // 4. Test filtering with completion_status=true to get only complete todos
  const completeTodos = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completion_status: true,
        limit: 100,
      },
    },
  );
  typia.assert(completeTodos);
  TestValidator.equals("complete todos count", completeTodos.data.length, 0);
  TestValidator.equals(
    "complete todos pagination records",
    completeTodos.pagination.records,
    0,
  );
  // 5. Test filtering with completion_status=false to get only incomplete todos
  const incompleteTodos = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completion_status: false,
        limit: 100,
      },
    },
  );
  typia.assert(incompleteTodos);
  TestValidator.equals(
    "incomplete todos count",
    incompleteTodos.data.length,
    4,
  );
  TestValidator.equals(
    "incomplete todos pagination records",
    incompleteTodos.pagination.records,
    4,
  );
  // Verify all returned todos are incomplete
  for (const todo of incompleteTodos.data) {
    TestValidator.predicate("todo is incomplete", todo.completed === false);
  }
  // 6. Verify filtering works correctly with sorting
  const sortedIncompleteTodos = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completion_status: false,
        sort_field: "created_at",
        sort_direction: "desc",
        limit: 100,
      },
    },
  );
  typia.assert(sortedIncompleteTodos);
  TestValidator.equals(
    "sorted incomplete todos count",
    sortedIncompleteTodos.data.length,
    4,
  );
  // Verify todos are sorted by created_at in descending order
  for (let i = 1; i < sortedIncompleteTodos.data.length; i++) {
    TestValidator.predicate(
      `todo ${i - 1} created_at >= todo ${i} created_at`,
      new Date(sortedIncompleteTodos.data[i - 1].created_at).getTime() >=
        new Date(sortedIncompleteTodos.data[i].created_at).getTime(),
    );
  }
  // 7. Verify filtering works correctly with pagination
  const paginatedIncompleteTodos =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completion_status: false,
        limit: 2,
        page: 1,
      },
    });
  typia.assert(paginatedIncompleteTodos);
  TestValidator.equals(
    "paginated incomplete todos page 1 count",
    paginatedIncompleteTodos.data.length,
    2,
  );
  TestValidator.equals(
    "paginated incomplete todos pagination current",
    paginatedIncompleteTodos.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated incomplete todos pagination limit",
    paginatedIncompleteTodos.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated incomplete todos pagination records",
    paginatedIncompleteTodos.pagination.records,
    4,
  );
  TestValidator.equals(
    "paginated incomplete todos pagination pages",
    paginatedIncompleteTodos.pagination.pages,
    2,
  );
  const paginatedIncompleteTodosPage2 =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        completion_status: false,
        limit: 2,
        page: 2,
      },
    });
  typia.assert(paginatedIncompleteTodosPage2);
  TestValidator.equals(
    "paginated incomplete todos page 2 count",
    paginatedIncompleteTodosPage2.data.length,
    2,
  );
  TestValidator.equals(
    "paginated incomplete todos page 2 pagination current",
    paginatedIncompleteTodosPage2.pagination.current,
    2,
  );
}
