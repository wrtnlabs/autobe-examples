import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test paginated and filtered retrieval of all user accounts by a registered
 * user.
 *
 * This test confirms that, after registering a user and authenticating, the
 * user can request a paginated and filterable list of all user accounts. The
 * endpoint must return summary-only fields (id and email), with correct
 * pagination meta.
 *
 * Steps:
 *
 * 1. Register a new user with random valid email/password
 * 2. Issue a listing request (PATCH /todoList/user/users) with various filters &
 *    pagination
 * 3. Validate pagination meta and ensure user objects have only id/email fields
 */
export async function test_api_list_all_users_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a user and login for authentication
  const joinRequest = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: joinRequest,
  });
  typia.assert(authorizedUser);

  // 2. Issue user listing request with pagination, sort, and filter
  const listRequest = {
    // Try to filter by email (partial match)
    email: authorizedUser.email,
    // randomize page/limit
    page: 1,
    limit: 10,
    sort_by: RandomGenerator.pick(["email", "created_at"] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies ITodoListUser.IRequest;

  const page = await api.functional.todoList.user.users.index(connection, {
    body: listRequest,
  });
  typia.assert(page);

  // 3. Validate result data
  // Pagination meta
  TestValidator.predicate(
    "current page is at least 1",
    page.pagination.current >= 1,
  );
  TestValidator.equals("page size is 10", page.pagination.limit, 10);
  TestValidator.predicate("records >= 1", page.pagination.records >= 1);
  TestValidator.predicate("data is array", Array.isArray(page.data));

  // Each user is ISummary, only id/email fields and non-sensitive
  for (const userSummary of page.data) {
    typia.assert<ITodoListUser.ISummary>(userSummary);
    TestValidator.predicate(
      "user summary only exposes id/email",
      Object.keys(userSummary).sort().join(",") === "email,id",
    );
    // Email match (since filtering by email)
    if (userSummary.id === authorizedUser.id) {
      TestValidator.equals(
        "listed user's email matches registered email",
        userSummary.email,
        authorizedUser.email,
      );
    }
  }
}
