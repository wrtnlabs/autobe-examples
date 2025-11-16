import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdmin";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test administrator search behavior when filter criteria match no existing
 * administrator accounts.
 *
 * This test validates proper handling of empty result sets, ensuring that the
 * API returns valid pagination metadata with zero records and appropriate empty
 * data arrays. The test verifies that no records matching impossible or highly
 * restrictive criteria return well-formed responses without errors, supporting
 * graceful handling of no-match scenarios in administrative interfaces.
 *
 * Steps:
 *
 * 1. Create and authenticate as an administrator
 * 2. Execute search with impossible criteria (non-existent email pattern)
 * 3. Validate response structure is well-formed
 * 4. Verify pagination metadata shows zero records and pages
 * 5. Confirm data array is empty but properly structured
 */
export async function test_api_admin_search_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Execute search with impossible email pattern that cannot match any existing admin
  const impossibleEmail = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@impossible-domain-that-does-not-exist.com`;

  const searchResult = await api.functional.todoList.admin.admins.index(
    connection,
    {
      body: {
        email: impossibleEmail,
        page: 1,
        limit: 10,
      } satisfies ITodoListAdmin.IRequest,
    },
  );

  // Step 3: Validate response structure
  typia.assert(searchResult);

  // Step 4: Verify pagination metadata shows zero records
  TestValidator.equals(
    "pagination records should be 0",
    searchResult.pagination.records,
    0,
  );

  TestValidator.equals(
    "pagination pages should be 0",
    searchResult.pagination.pages,
    0,
  );

  TestValidator.predicate(
    "pagination current should be valid",
    searchResult.pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    searchResult.pagination.limit > 0,
  );

  // Step 5: Confirm data array is empty but properly structured
  TestValidator.equals(
    "data array should be empty",
    searchResult.data.length,
    0,
  );

  TestValidator.predicate(
    "data should be an array",
    Array.isArray(searchResult.data),
  );
}
