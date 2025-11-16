import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";

/**
 * Test search behavior when no configurations match the criteria.
 *
 * This test validates that the configuration search endpoint handles empty
 * search results gracefully. An administrator account is created and
 * authenticated. The endpoint is then called with a search term that doesn't
 * match any configuration keys or descriptions (e.g., 'xyz123nonexistent').
 *
 * The test ensures:
 *
 * 1. Administrator can be created and authenticated via the join endpoint
 * 2. Search endpoint accepts valid pagination parameters (page=1, limit=20)
 * 3. Empty search results are returned as a valid response (not an error)
 * 4. Response includes proper pagination metadata with records=0 and appropriate
 *    pages count
 * 5. The data array is empty (length 0) when search yields no matches
 * 6. No exceptions are thrown when searching for non-existent configurations
 *
 * Process:
 *
 * 1. Create administrator account with valid credentials
 * 2. Authenticate administrator (automatic via join endpoint)
 * 3. Call search endpoint with non-matching search term 'xyz123nonexistent'
 * 4. Validate response structure and empty data array
 * 5. Verify pagination shows zero records
 */
export async function test_api_platform_configuration_empty_search_results(
  connection: api.IConnection,
) {
  // 1. Create and authenticate administrator account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123!",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/setup",
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const authenticatedAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCreateData,
    });
  typia.assert(authenticatedAdmin);

  // 2. Search for configurations with a non-existent search term
  const searchRequest = {
    page: 1,
    limit: 20,
    search: "xyz123nonexistent",
  } satisfies ICommunityPlatformConfiguration.IRequest;

  const searchResult: IPageICommunityPlatformConfiguration.ISummary =
    await api.functional.communityPlatform.administrator.configurations.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // 3. Validate empty search results structure
  TestValidator.predicate(
    "search result data array should be empty",
    searchResult.data.length === 0,
  );

  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    searchResult.pagination.limit,
    20,
  );

  TestValidator.equals(
    "pagination total records should be 0",
    searchResult.pagination.records,
    0,
  );

  TestValidator.predicate(
    "pagination pages should be 0 or 1",
    searchResult.pagination.pages === 0 || searchResult.pagination.pages === 1,
  );

  // 5. Verify data array is empty
  TestValidator.predicate(
    "data array must be empty array",
    Array.isArray(searchResult.data) && searchResult.data.length === 0,
  );
}
