import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Call the todos endpoint with default pagination (no filter parameters)
  // Since there's no todo creation endpoint in the SDK, we test with whatever
  // exists in the system (likely empty or pre-existing data)
  const response = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {} satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure and default pagination behavior
  TestValidator.equals(
    "pagination current page (default)",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 4. Validate data array structure
  // Each todo should have required fields when present
  for (let i = 0; i < response.data.length; i++) {
    const todo = response.data[i];
    typia.assert(todo);
    TestValidator.predicate(`todo ${i} has id`, todo.id !== undefined);
    TestValidator.predicate(
      `todo ${i} has title`,
      todo.title !== undefined && typeof todo.title === "string",
    );
    TestValidator.predicate(
      `todo ${i} has is_complete`,
      typeof todo.is_complete === "boolean",
    );
    TestValidator.predicate(
      `todo ${i} has created_at`,
      todo.created_at !== undefined,
    );
    TestValidator.equals(
      `todo ${i} deleted_at is null (not soft-deleted)`,
      todo.deleted_at,
      null,
    );
    TestValidator.predicate(`todo ${i} has author`, todo.author !== undefined);
    TestValidator.equals(
      `todo ${i} author email matches`,
      todo.author.email,
      authorized.email,
    );
    TestValidator.equals(
      `todo ${i} author id matches`,
      todo.author.id,
      authorized.id,
    );
    // Validate date fields can be null or valid date-time strings
    if (todo.start_date !== null) {
      TestValidator.predicate(
        `todo ${i} start_date is valid ISO string`,
        typeof todo.start_date === "string",
      );
    }
    if (todo.due_date !== null) {
      TestValidator.predicate(
        `todo ${i} due_date is valid ISO string`,
        typeof todo.due_date === "string",
      );
    }
    // Validate author has all required fields
    typia.assert(todo.author);
    TestValidator.predicate(
      `todo ${i} author has id`,
      todo.author.id !== undefined,
    );
    TestValidator.predicate(
      `todo ${i} author has email`,
      todo.author.email !== undefined,
    );
    TestValidator.predicate(
      `todo ${i} author has created_at`,
      todo.author.created_at !== undefined,
    );
    TestValidator.predicate(
      `todo ${i} author has updated_at`,
      todo.author.updated_at !== undefined,
    );
    TestValidator.predicate(
      `todo ${i} author has deleted_at`,
      todo.author.deleted_at !== undefined,
    );
  }
  // 5. Validate pagination consistency
  TestValidator.equals(
    "pagination records matches data length",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.predicate(
    "response data is array",
    Array.isArray(response.data),
  );
  // 6. Verify no soft-deleted todos appear in active list
  for (const todo of response.data) {
    TestValidator.equals(
      `todo ${todo.id} deleted_at is null`,
      todo.deleted_at,
      null,
    );
  }
  // 7. Verify todos are sorted by created_at descending (default sort)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTodo = response.data[i];
      const nextTodo = response.data[i + 1];
      const currentCreated = new Date(currentTodo.created_at).getTime();
      const nextCreated = new Date(nextTodo.created_at).getTime();
      TestValidator.predicate(
        `todos sorted by created_at desc (todo ${i} to ${i + 1})`,
        currentCreated >= nextCreated,
      );
    }
  }
  // 8. Verify todos without dates appear at end when sorted by date fields
  // (This is default behavior - todos without start_date/due_date should appear last)
  // Since we're using default sort (created_at), this validation applies when
  // sorting by start_date or due_date, but we're testing default pagination
  // So we just verify the data structure is correct
  // 9. Test with custom pagination parameters to validate defaults work
  const customResponse = await api.functional.multiUserTodo.member.todos.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom pagination limit applied",
    customResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom pagination records updated",
    customResponse.pagination.records,
    response.pagination.records,
  );
  // 10. Test with status filter to ensure it's optional
  const filteredResponse =
    await api.functional.multiUserTodo.member.todos.index(memberConnection, {
      body: {
        status: "all",
      } satisfies IMultiUserTodoTodo.IRequest,
    });
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered response has correct status filter",
    filteredResponse.pagination.records,
    response.pagination.records,
  );
}
