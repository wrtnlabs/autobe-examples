import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

/**
 * Test member search behavior when no members match the specified search
 * criteria.
 *
 * This test validates that the system properly handles empty result sets by
 * returning appropriate pagination information with zero records and empty data
 * arrays. This ensures that search interfaces can gracefully handle no-match
 * scenarios without errors or unexpected behavior.
 */
export async function test_api_member_search_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator to establish proper authorization context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "securePassword123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create search criteria that guarantees no matches
  // Use a unique email pattern that doesn't exist in the system
  const searchRequest = {
    email_pattern: "nonexistent-domain-12345@example.com",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMember.IRequest;

  // Step 3: Call member search API with the specific criteria
  const searchResult =
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination structure
  TestValidator.equals(
    "pagination object exists",
    typeof searchResult.pagination,
    "object",
  );

  // Step 5: Validate pagination fields for empty results
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be zero",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be zero",
    searchResult.pagination.pages,
    0,
  );

  // Step 6: Validate data array is empty
  TestValidator.equals(
    "data array should be empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "data array should be empty array",
    searchResult.data,
    [],
  );
}
