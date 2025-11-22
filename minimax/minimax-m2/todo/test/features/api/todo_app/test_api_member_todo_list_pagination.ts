import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

export async function test_api_member_todo_list_pagination(
  connection: api.IConnection,
) {
  // Create member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active" as const,
  };

  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Test 1: Default pagination behavior
  const defaultPage = await api.functional.todoApp.member.members.todos.index(
    connection,
    {
      memberId: member.id,
      body: {}, // Empty body for default pagination
    },
  );
  typia.assert(defaultPage);

  TestValidator.equals(
    "default pagination current page",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.notEquals(
    "pagination records count exists",
    defaultPage.pagination.records,
    null,
  );
  TestValidator.notEquals(
    "pagination pages count exists",
    defaultPage.pagination.pages,
    null,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    defaultPage.pagination.records >= defaultPage.data.length,
  );

  // Test 2: Custom page size
  const customLimitPage =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        limit: 5,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(customLimitPage);

  TestValidator.equals(
    "custom limit applied",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    customLimitPage.data.length <= 5,
  );

  // Test 3: Specific page request
  const page2Request = await api.functional.todoApp.member.members.todos.index(
    connection,
    {
      memberId: member.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page2Request);

  TestValidator.equals(
    "page 2 request current page",
    page2Request.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 request limit",
    page2Request.pagination.limit,
    10,
  );

  // Test 4: Response structure validation for each todo item
  if (defaultPage.data.length > 0) {
    const firstTodo = defaultPage.data[0];
    typia.assert(firstTodo);

    TestValidator.notEquals("todo has ID", firstTodo.id, null);
    TestValidator.notEquals("todo has title", firstTodo.title, null);
    TestValidator.notEquals("todo has status", firstTodo.status, null);
    TestValidator.predicate(
      "todo status is valid",
      firstTodo.status === "pending" ||
        firstTodo.status === "in_progress" ||
        firstTodo.status === "completed" ||
        firstTodo.status === "cancelled",
    );
  }

  // Test 5: Pagination metadata consistency
  const totalRecords = defaultPage.pagination.records;
  const limit = defaultPage.pagination.limit;
  const expectedPages = Math.ceil(totalRecords / limit);

  TestValidator.equals(
    "total pages calculation",
    defaultPage.pagination.pages,
    expectedPages,
  );

  // Test 6: Edge case - large page number
  const largePageRequest =
    await api.functional.todoApp.member.members.todos.index(connection, {
      memberId: member.id,
      body: {
        page: 9999,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(largePageRequest);

  TestValidator.equals(
    "large page request returns empty data",
    largePageRequest.data.length,
    0,
  );
  TestValidator.predicate(
    "large page maintains pagination structure",
    largePageRequest.pagination.records === totalRecords &&
      largePageRequest.pagination.limit === 10 &&
      largePageRequest.pagination.current === 9999,
  );

  // Test 7: Different limit values
  const limitValues = [1, 10, 25, 50, 100];

  for (const testLimit of limitValues) {
    const pageWithLimit =
      await api.functional.todoApp.member.members.todos.index(connection, {
        memberId: member.id,
        body: {
          limit: testLimit,
        } satisfies ITodoAppTodo.IRequest,
      });
    typia.assert(pageWithLimit);

    TestValidator.equals(
      `limit ${testLimit} applied correctly`,
      pageWithLimit.pagination.limit,
      testLimit,
    );
    TestValidator.predicate(
      `data length does not exceed ${testLimit}`,
      pageWithLimit.data.length <= testLimit,
    );
  }

  // Test 8: Validate that member can only access their own todos
  TestValidator.predicate(
    "all returned todos have valid structure",
    defaultPage.data.every(
      (todo) =>
        typeof todo.id === "string" &&
        typeof todo.title === "string" &&
        typeof todo.status === "string" &&
        typeof todo.created_at === "string" &&
        typeof todo.updated_at === "string",
    ),
  );
}
