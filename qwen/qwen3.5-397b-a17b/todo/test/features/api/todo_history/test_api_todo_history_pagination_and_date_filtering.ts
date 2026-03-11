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

/**
 * Test pagination and date range filtering capabilities for todo edit history.
 *
 * Test Steps:
 * 1. Authenticate as a member via /todoApp/auth/member/join
 * 2. Create a todo via POST /todoApp/member/todos
 * 3. Test pagination with different page numbers and limit 10
 * 4. Test date range filtering with 'from' and 'to' parameters
 * 5. Test sorting with default and custom sort parameters
 * 6. Validate pagination metadata accuracy
 */
export async function test_api_todo_history_pagination_and_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Test pagination - Page 1 with limit 10
  const page1 = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate("page 1 pagination valid", () => {
    return page1.pagination.current === 1 && page1.pagination.limit === 10;
  });
  // 4. Test pagination - Page 2 with limit 10
  const page2 = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  // 5. Test pagination - Page 3 with limit 10
  const page3 = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  // 6. Test date range filtering - 'from' parameter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 1);
  const fromFiltered =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          from: fromDate.toISOString(),
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(fromFiltered);
  TestValidator.predicate("from filter returns valid structure", () => {
    return (
      Array.isArray(fromFiltered.data) && fromFiltered.pagination !== undefined
    );
  });
  // 7. Test date range filtering - 'to' parameter
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 1);
  const toFiltered = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        to: toDate.toISOString(),
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(toFiltered);
  TestValidator.predicate("to filter returns valid structure", () => {
    return (
      Array.isArray(toFiltered.data) && toFiltered.pagination !== undefined
    );
  });
  // 8. Test date range filtering - both 'from' and 'to' parameters
  const rangeFiltered =
    await api.functional.todoApp.member.todos.histories.index(
      memberConnection,
      {
        todoId: todo.id,
        body: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
        } satisfies ITodoAppTodoHistory.IRequest,
      },
    );
  typia.assert(rangeFiltered);
  TestValidator.predicate("range filter returns valid structure", () => {
    return (
      Array.isArray(rangeFiltered.data) &&
      rangeFiltered.pagination !== undefined
    );
  });
  // 9. Test default sorting (created_at:desc)
  const defaultSort = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        sort: "created_at:desc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(defaultSort);
  TestValidator.predicate("default sort returns valid structure", () => {
    return (
      Array.isArray(defaultSort.data) && defaultSort.pagination !== undefined
    );
  });
  // 10. Test custom sorting (created_at:asc)
  const ascSort = await api.functional.todoApp.member.todos.histories.index(
    memberConnection,
    {
      todoId: todo.id,
      body: {
        sort: "created_at:asc",
      } satisfies ITodoAppTodoHistory.IRequest,
    },
  );
  typia.assert(ascSort);
  TestValidator.predicate("asc sort returns valid structure", () => {
    return Array.isArray(ascSort.data) && ascSort.pagination !== undefined;
  });
  // 11. Validate pagination metadata structure
  TestValidator.predicate("pagination metadata complete", () => {
    const { pagination } = page1;
    return (
      typeof pagination.current === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.records === "number" &&
      typeof pagination.pages === "number"
    );
  });
}
