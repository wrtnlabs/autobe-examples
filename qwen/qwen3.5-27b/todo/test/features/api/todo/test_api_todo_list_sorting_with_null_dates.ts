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
 * Test todo list sorting functionality with proper handling of null date values.
 *
 * Validates that the todo list endpoint correctly sorts todos by different fields (created_at, start_date, due_date) in both ascending and descending order. Special attention is given to ensuring that todos with null date values always appear at the end of the sorted list, regardless of sort direction.
 *
 * The test creates multiple todos with varying date configurations to comprehensively verify sorting behavior: todos with both dates, todos with only one date set, and todos with neither date set.
 *
 * 1. Register a new member account for isolated testing.
 * 2. Create 6 todos with different date configurations to test sorting edge cases.
 * 3. Test sorting by created_at in ascending and descending order.
 * 4. Test sorting by start_date with null values appearing last in both directions.
 * 5. Test sorting by due_date with null values appearing last in both directions.
 */
export async function test_api_todo_list_sorting_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create todos with different date configurations
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // Todo 1: Both start_date and due_date set
  const todo1 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates - early",
        start_date: yesterday.toISOString(),
        due_date: now.toISOString(),
      },
    },
  );
  typia.assert(todo1);
  // Wait to ensure different created_at timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Todo 2: Only start_date set
  const todo2 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with only start_date",
        start_date: tomorrow.toISOString(),
      },
    },
  );
  typia.assert(todo2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Todo 3: Only due_date set
  const todo3 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with only due_date",
        due_date: tomorrow.toISOString(),
      },
    },
  );
  typia.assert(todo3);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Todo 4: Neither date set (both null)
  const todo4 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with no dates",
      },
    },
  );
  typia.assert(todo4);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Todo 5: Both dates set (later than todo1)
  const todo5 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with both dates - late",
        start_date: now.toISOString(),
        due_date: tomorrow.toISOString(),
      },
    },
  );
  typia.assert(todo5);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Todo 6: Only start_date set (earlier than todo2)
  const todo6 = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Todo with only start_date - early",
        start_date: now.toISOString(),
      },
    },
  );
  typia.assert(todo6);
  // 3. Test sorting by created_at ascending
  const createdAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "created_at",
        sort_direction: "asc",
        limit: 100,
      },
    },
  );
  typia.assert(createdAsc);
  TestValidator.equals("created_at asc count", createdAsc.data.length, 6);
  TestValidator.equals("created_at asc order", createdAsc.data[0].id, todo1.id);
  TestValidator.equals("created_at asc last", createdAsc.data[5].id, todo6.id);
  // 4. Test sorting by created_at descending
  const createdDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "created_at",
        sort_direction: "desc",
        limit: 100,
      },
    },
  );
  typia.assert(createdDesc);
  TestValidator.equals("created_at desc count", createdDesc.data.length, 6);
  TestValidator.equals(
    "created_at desc first",
    createdDesc.data[0].id,
    todo6.id,
  );
  TestValidator.equals(
    "created_at desc last",
    createdDesc.data[5].id,
    todo1.id,
  );
  // 5. Test sorting by start_date ascending (nulls last)
  const startDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "start_date",
        sort_direction: "asc",
        limit: 100,
      },
    },
  );
  typia.assert(startDateAsc);
  TestValidator.equals("start_date asc count", startDateAsc.data.length, 6);
  // First should be todo1 (yesterday)
  TestValidator.equals(
    "start_date asc first",
    startDateAsc.data[0].id,
    todo1.id,
  );
  // Last two should have null start_date (todo3, todo4)
  TestValidator.predicate(
    "start_date asc last is null",
    startDateAsc.data[5].start_date === null,
  );
  TestValidator.predicate(
    "start_date asc second last is null",
    startDateAsc.data[4].start_date === null,
  );
  // 6. Test sorting by start_date descending (nulls last)
  const startDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "start_date",
        sort_direction: "desc",
        limit: 100,
      },
    },
  );
  typia.assert(startDateDesc);
  TestValidator.equals("start_date desc count", startDateDesc.data.length, 6);
  // First should be todo2 (tomorrow)
  TestValidator.equals(
    "start_date desc first",
    startDateDesc.data[0].id,
    todo2.id,
  );
  // Last two should have null start_date
  TestValidator.predicate(
    "start_date desc last is null",
    startDateDesc.data[5].start_date === null,
  );
  TestValidator.predicate(
    "start_date desc second last is null",
    startDateDesc.data[4].start_date === null,
  );
  // 7. Test sorting by due_date ascending (nulls last)
  const dueDateAsc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "due_date",
        sort_direction: "asc",
        limit: 100,
      },
    },
  );
  typia.assert(dueDateAsc);
  TestValidator.equals("due_date asc count", dueDateAsc.data.length, 6);
  // First should be todo1 (now)
  TestValidator.equals("due_date asc first", dueDateAsc.data[0].id, todo1.id);
  // Last should have null due_date (todo2, todo4, todo6)
  TestValidator.predicate(
    "due_date asc last is null",
    dueDateAsc.data[5].due_date === null,
  );
  TestValidator.predicate(
    "due_date asc second last is null",
    dueDateAsc.data[4].due_date === null,
  );
  // 8. Test sorting by due_date descending (nulls last)
  const dueDateDesc = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        sort_field: "due_date",
        sort_direction: "desc",
        limit: 100,
      },
    },
  );
  typia.assert(dueDateDesc);
  TestValidator.equals("due_date desc count", dueDateDesc.data.length, 6);
  // First should be todo3 or todo5 (tomorrow)
  TestValidator.predicate(
    "due_date desc first not null",
    dueDateDesc.data[0].due_date !== null,
  );
  // Last should have null due_date
  TestValidator.predicate(
    "due_date desc last is null",
    dueDateDesc.data[5].due_date === null,
  );
}
