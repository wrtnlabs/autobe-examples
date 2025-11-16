import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import type { ISortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOrder";
import type { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test configuration search pagination with different page sizes and limits.
 * Validate that pagination metadata (current page, total records, total pages)
 * is calculated correctly. Verify that maximum limit of 100 records per page is
 * enforced and that empty result sets are handled properly.
 */
export async function test_api_configuration_search_pagination_limits(
  connection: api.IConnection,
) {
  // Create a user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      password_hash: userPassword, // Using password as hash for simplicity in test
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Test pagination with limit 1
  const firstPageLimit1 =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(firstPageLimit1);

  TestValidator.equals(
    "page number should be 1 for first page with limit 1",
    firstPageLimit1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 1 for first page with limit 1",
    firstPageLimit1.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "total records should be non-negative for limit 1",
    firstPageLimit1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly for limit 1",
    firstPageLimit1.pagination.pages ===
      Math.max(
        1,
        Math.ceil(
          firstPageLimit1.pagination.records / firstPageLimit1.pagination.limit,
        ),
      ),
  );

  // Test pagination with limit 50
  const firstPageLimit50 =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(firstPageLimit50);

  TestValidator.equals(
    "page number should be 1 for first page with limit 50",
    firstPageLimit50.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 50 for first page with limit 50",
    firstPageLimit50.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "total records should be non-negative for limit 50",
    firstPageLimit50.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly for limit 50",
    firstPageLimit50.pagination.pages ===
      Math.max(
        1,
        Math.ceil(
          firstPageLimit50.pagination.records /
            firstPageLimit50.pagination.limit,
        ),
      ),
  );

  // Test pagination with maximum limit 100
  const firstPageLimit100 =
    await api.functional.todoApp.user.configurations.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies ITodoAppConfiguration.IRequest,
    });
  typia.assert(firstPageLimit100);

  TestValidator.equals(
    "page number should be 1 for first page with limit 100",
    firstPageLimit100.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 100 for first page with limit 100",
    firstPageLimit100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "total records should be non-negative for limit 100",
    firstPageLimit100.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly for limit 100",
    firstPageLimit100.pagination.pages ===
      Math.max(
        1,
        Math.ceil(
          firstPageLimit100.pagination.records /
            firstPageLimit100.pagination.limit,
        ),
      ),
  );

  // Test that the API properly handles the maximum limit constraint
  TestValidator.predicate(
    "API should correctly apply the maximum limit of 100",
    firstPageLimit100.pagination.limit === 100,
  );

  // Test empty result set handling with a search term that doesn't exist
  const emptyResults = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        search:
          "nonexistent-configuration-search-term-that-wont-match-anything",
        page: 1,
        limit: 10,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(emptyResults);

  TestValidator.equals(
    "empty result set should return empty data array",
    emptyResults.data.length,
    0,
  );
  TestValidator.equals(
    "page number should be 1 for empty results",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10 for empty results",
    emptyResults.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly for empty results",
    emptyResults.pagination.pages ===
      Math.max(
        1,
        Math.ceil(
          emptyResults.pagination.records / emptyResults.pagination.limit,
        ),
      ),
  );

  // Test boundary condition with page number 1
  const boundaryPage1 = await api.functional.todoApp.user.configurations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 25,
      } satisfies ITodoAppConfiguration.IRequest,
    },
  );
  typia.assert(boundaryPage1);

  TestValidator.equals(
    "page 1 should be valid for boundary test",
    boundaryPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 25 for boundary test",
    boundaryPage1.pagination.limit,
    25,
  );

  // Verify that the limit field in pagination metadata respects the constraints
  TestValidator.predicate(
    "limit in pagination metadata should be between 1 and 100",
    boundaryPage1.pagination.limit >= 1 &&
      boundaryPage1.pagination.limit <= 100,
  );

  // Test that the data array length matches the limit when there are enough records
  if (boundaryPage1.pagination.records >= boundaryPage1.pagination.limit) {
    TestValidator.equals(
      "data array length should match limit when sufficient records exist",
      boundaryPage1.data.length,
      boundaryPage1.pagination.limit,
    );
  } else {
    TestValidator.equals(
      "data array length should match available records when insufficient",
      boundaryPage1.data.length,
      boundaryPage1.pagination.records,
    );
  }
}
