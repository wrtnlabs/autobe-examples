import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search with limit parameter boundaries.
 *
 * This test validates that the administrator search API properly handles
 * pagination limit constraints by testing three critical scenarios:
 *
 * 1. Minimum limit (1): Verify the API accepts and correctly returns exactly 1
 *    result per page
 * 2. Maximum limit (100): Verify the API accepts and correctly returns up to 100
 *    results per page
 * 3. Default behavior: Verify the API uses appropriate default limit when not
 *    specified
 *
 * The test creates sufficient admin accounts to validate pagination behavior
 * across different limit values and ensures the API enforces boundary
 * constraints correctly.
 */
export async function test_api_admin_search_with_limit_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create initial admin account for authentication
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(firstAdmin);

  // Step 2: Create multiple admin accounts to test pagination (create 105 additional admins)
  const adminCount = 105;
  await ArrayUtil.asyncRepeat(adminCount, async (index) => {
    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
    typia.assert(admin);
  });

  // Step 3: Test minimum limit boundary (limit = 1)
  const minLimitResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(minLimitResult);

  TestValidator.equals(
    "minimum limit returns exactly 1 result",
    minLimitResult.data.length,
    1,
  );
  TestValidator.equals(
    "minimum limit pagination has correct limit",
    minLimitResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "minimum limit has sufficient total records",
    minLimitResult.pagination.records >= adminCount + 1,
  );

  // Step 4: Test maximum limit boundary (limit = 100)
  const maxLimitResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(maxLimitResult);

  TestValidator.equals(
    "maximum limit returns up to 100 results",
    maxLimitResult.data.length,
    100,
  );
  TestValidator.equals(
    "maximum limit pagination has correct limit",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit has sufficient total records",
    maxLimitResult.pagination.records >= adminCount + 1,
  );

  // Step 5: Test default behavior (no limit specified)
  const defaultLimitResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {} satisfies ITodoListAdmin.IRequest,
    },
  );
  typia.assert(defaultLimitResult);

  TestValidator.predicate(
    "default limit returns reasonable page size",
    defaultLimitResult.data.length > 0 && defaultLimitResult.data.length <= 100,
  );
  TestValidator.predicate(
    "default limit pagination has positive limit value",
    defaultLimitResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default limit has correct total records",
    defaultLimitResult.pagination.records >= adminCount + 1,
  );

  // Step 6: Verify pagination metadata consistency
  TestValidator.equals(
    "all queries return same total record count",
    minLimitResult.pagination.records,
    maxLimitResult.pagination.records,
  );
  TestValidator.equals(
    "default result has same total as min limit",
    defaultLimitResult.pagination.records,
    minLimitResult.pagination.records,
  );
}
