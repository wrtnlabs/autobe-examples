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
 * Test searching for todos with various filters.
 * 1. Create a member account and authenticate
 * 2. Create multiple todos with different attributes (completed/incomplete, different dates, various titles)
 * 3. Use the patch endpoint to search with text search, completion status filtering, and date range filters
 * 4. Verify that the pagination works correctly and only returns todos belonging to the authenticated member
 */
export async function test_api_todo_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and authenticate using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create multiple todos with various attributes
  const todos: ITodoAppTodo[] = [];
  // Create a mix of todos with different attributes
  for (let i = 0; i < 10; i++) {
    const todoCreate = prepare_random_todo_app_todo();
    // Add some todos with specific titles for text search testing
    if (i % 3 === 0) {
      todoCreate.title = `Important Task ${RandomGenerator.alphabets(5)}`;
    }
    if (i % 4 === 0) {
      todoCreate.description = `Critical: ${RandomGenerator.paragraph({ sentences: 2 })}`;
    }
    // Set different dates for date range filtering
    const baseDate = new Date("2024-01-01T00:00:00Z");
    const daysOffset = i * 2;
    const todoDate = new Date(
      baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000,
    );
    todoCreate.start_date = todoDate.toISOString();
    todoCreate.due_date = new Date(
      todoDate.getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    // Create todo using utility function
    const todo = await generate_random_todo_app_member_todos_create(
      memberConnection,
      { body: todoCreate },
    );
    typia.assert(todo);
    todos.push(todo);
  }
  // 3. Test filtering with different criteria using PATCH /todoApp/member/todos
  // Test 1: Text search
  const searchResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: "Important",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate search results belong to the authenticated member
  TestValidator.predicate(
    "Search results belong to authenticated member",
    searchResponse.data.every((todo) => todo.member.id === member.id),
  );
  // Test 2: Filter by completion status (false - incomplete)
  const incompleteResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(incompleteResponse);
  // Test 3: Filter by completion status (true - completed)
  const completedResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        completed: true,
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(completedResponse);
  // Test 4: Date range filtering
  const startDate = new Date("2024-01-05T00:00:00Z").toISOString();
  const endDate = new Date("2024-01-15T00:00:00Z").toISOString();
  const dateRangeResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        start_date_range: { start: startDate, end: endDate },
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(dateRangeResponse);
  // Test 5: Pagination
  const paginationResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 3,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "Pagination limit matches request",
    paginationResponse.pagination.limit === 3,
  );
  TestValidator.predicate(
    "Pagination current page is 1",
    paginationResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "Data length does not exceed limit",
    paginationResponse.data.length <= 3,
  );
  // Test 6: All todos for the member (no filters)
  const allResponse = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(allResponse);
  // Validate all results belong to the authenticated member
  TestValidator.predicate(
    "All todos belong to authenticated member",
    allResponse.data.every((todo) => todo.member.id === member.id),
  );
}
