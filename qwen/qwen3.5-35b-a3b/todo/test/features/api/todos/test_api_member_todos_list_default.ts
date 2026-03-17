import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_todos_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Call todos list endpoint with default parameters (empty body uses defaults)
  // Default behavior: page=1, limit=10, status='all', sortBy='createdAt', sortOrder='desc'
  const response = await api.functional.multiUserTodoApp.member.todos.index(
    memberConnection,
    {
      body: {} satisfies IMultiUserTodoAppTodo.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure - IPageIMultiUserTodoAppTodo.ISummary
  typia.assert(response);
  // 4. Verify pagination metadata structure
  typia.assert(response.pagination);
  // 5. Verify pagination fields with sensible defaults
  TestValidator.equals(
    "current page defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit defaults to 10", response.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Verify data array exists and contains valid ISummary objects
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 7. Validate each todo in data array has required fields
  for (const todo of response.data) {
    typia.assert(todo);
    // Verify all ISummary fields exist and have correct types
    TestValidator.equals(
      "todo has uuid id",
      /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/i.test(todo.id),
      true,
    );
    TestValidator.equals(
      "todo has string title",
      typeof todo.title === "string",
      true,
    );
    TestValidator.equals(
      "todo has string or null description",
      todo.description === null || typeof todo.description === "string",
      true,
    );
    TestValidator.equals(
      "todo has date-time or null start_date",
      todo.start_date === null || /\d{4}-\d{2}-\d{2}/.test(todo.start_date),
      true,
    );
    TestValidator.equals(
      "todo has date-time or null due_date",
      todo.due_date === null || /\d{4}-\d{2}-\d{2}/.test(todo.due_date),
      true,
    );
    TestValidator.equals(
      "todo has boolean is_completed",
      typeof todo.is_completed === "boolean",
      true,
    );
    TestValidator.equals(
      "todo has date-time created_at",
      typeof todo.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}/.test(todo.created_at),
      true,
    );
    TestValidator.equals(
      "todo has date-time updated_at",
      typeof todo.updated_at === "string" &&
        /\d{4}-\d{2}-\d{2}/.test(todo.updated_at),
      true,
    );
    TestValidator.equals(
      "todo has date-time or null deleted_at",
      todo.deleted_at === null ||
        (typeof todo.deleted_at === "string" &&
          /\d{4}-\d{2}-\d{2}/.test(todo.deleted_at)),
      true,
    );
  }
  // 8. Verify pagination consistency
  const expectedPages =
    Math.ceil(response.pagination.records / response.pagination.limit) || 0;
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
}
