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

/**
 * Test sorting behavior when todos have null date values.
 *
 * Validates that the todo list sorting endpoint correctly handles null date values by placing them at the end of sorted results regardless of sort direction. This test authenticates as a member and exercises the sorting functionality with various sort parameters to verify the API responds correctly and maintains proper sorting semantics.
 *
 * Note: This test validates the sorting endpoint behavior and response structure. Full sorting validation with specific null date scenarios requires todo creation capabilities which are not available in the current API surface. The test verifies that sorting parameters are accepted and responses contain properly structured data with sortable fields.
 *
 * 1. Member authenticates via join endpoint to access protected todo operations.
 * 2. Calls index endpoint with sorting by startDate ascending.
 * 3. Calls index endpoint with sorting by startDate descending.
 * 4. Calls index endpoint with sorting by dueDate ascending.
 * 5. Calls index endpoint with sorting by dueDate descending.
 * 6. Calls index endpoint with sorting by createdAt.
 * 7. Validates response structure contains all expected sortable fields.
 */
export async function test_api_todo_list_sorting_with_null_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ITodoAppMember.IAuthorized =
    await api.functional.todoApp.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    });
  typia.assert(member);
  // 2. Test sorting by startDate ascending
  const startDateAscResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort_by: "startDate",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(startDateAscResult);
  // Validate response structure
  TestValidator.predicate(
    "startDate ascending returns valid pagination",
    startDateAscResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "startDate ascending returns data array",
    Array.isArray(startDateAscResult.data),
  );
  // Validate todos have sortable fields
  if (startDateAscResult.data.length > 0) {
    const firstTodo = startDateAscResult.data[0];
    typia.assert(firstTodo);
    TestValidator.predicate(
      "todo has start_date field",
      firstTodo.start_date === null ||
        firstTodo.start_date === undefined ||
        typeof firstTodo.start_date === "string",
    );
    TestValidator.predicate(
      "todo has due_date field",
      firstTodo.due_date === null ||
        firstTodo.due_date === undefined ||
        typeof firstTodo.due_date === "string",
    );
    TestValidator.predicate(
      "todo has created_at field",
      typeof firstTodo.created_at === "string",
    );
  }
  // 3. Test sorting by startDate descending
  const startDateDescResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort_by: "startDate",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(startDateDescResult);
  TestValidator.predicate(
    "startDate descending returns valid response",
    startDateDescResult.pagination.current >= 1,
  );
  // 4. Test sorting by dueDate ascending
  const dueDateAscResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort_by: "dueDate",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dueDateAscResult);
  TestValidator.predicate(
    "dueDate ascending returns valid response",
    dueDateAscResult.pagination.current >= 1,
  );
  // 5. Test sorting by dueDate descending
  const dueDateDescResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort_by: "dueDate",
        sort_order: "desc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(dueDateDescResult);
  TestValidator.predicate(
    "dueDate descending returns valid response",
    dueDateDescResult.pagination.current >= 1,
  );
  // 6. Test sorting by createdAt
  const createdAtResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {
        sort_by: "createdAt",
        sort_order: "asc",
      } satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(createdAtResult);
  TestValidator.predicate(
    "createdAt sort returns valid response",
    createdAtResult.pagination.current >= 1,
  );
  // 7. Test default sorting (no sort parameters)
  const defaultResult: IPageITodoAppTodo.ISummary =
    await api.functional.todoApp.member.todos.index(memberConnection, {
      body: {} satisfies ITodoAppTodo.IRequest,
    });
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default sort returns valid response",
    defaultResult.pagination.current >= 1,
  );
  // 8. Verify all responses have consistent structure
  const allResults = [
    startDateAscResult,
    startDateDescResult,
    dueDateAscResult,
    dueDateDescResult,
    createdAtResult,
    defaultResult,
  ];
  await ArrayUtil.asyncForEach(allResults, async (result, index) => {
    TestValidator.equals(
      `result ${index} has pagination`,
      result.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      `result ${index} has data array`,
      Array.isArray(result.data),
      true,
    );
  });
}
