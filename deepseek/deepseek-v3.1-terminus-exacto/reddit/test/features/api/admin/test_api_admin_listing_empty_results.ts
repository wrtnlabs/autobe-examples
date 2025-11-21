import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";

/**
 * Test administrator listing behavior when no administrators match search
 * criteria. Validates that empty search results return proper pagination
 * structure with zero records. Tests edge cases including searching for
 * non-existent email domains, invalid admin levels, and impossible super admin
 * combinations. Verifies that the API returns appropriate empty result sets
 * rather than errors when no administrators match filtering criteria.
 */
export async function test_api_admin_listing_empty_results(
  connection: api.IConnection,
) {
  // 1. Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "support",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Test empty search with non-existent email domain
  const emptyDomainSearch =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        search: "@nonexistent-domain.com",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(emptyDomainSearch);
  TestValidator.equals(
    "empty domain search should return zero records",
    emptyDomainSearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty domain search pagination records should be zero",
    emptyDomainSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty domain search pagination pages should be zero",
    emptyDomainSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty domain search pagination current page should be 1",
    emptyDomainSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty domain search pagination limit should match request",
    emptyDomainSearch.pagination.limit,
    10,
  );

  // 3. Test empty search with invalid admin level
  const invalidLevelSearch =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        admin_level: "invalid_level_that_does_not_exist",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(invalidLevelSearch);
  TestValidator.equals(
    "invalid level search should return zero records",
    invalidLevelSearch.data.length,
    0,
  );
  TestValidator.equals(
    "invalid level search pagination records should be zero",
    invalidLevelSearch.pagination.records,
    0,
  );

  // 4. Test empty search with impossible super admin combination
  const impossibleSuperAdminSearch =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        is_super_admin: true,
        admin_level: "support", // Support level cannot be super admin
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(impossibleSuperAdminSearch);
  TestValidator.equals(
    "impossible super admin search should return zero records",
    impossibleSuperAdminSearch.data.length,
    0,
  );
  TestValidator.equals(
    "impossible super admin search pagination records should be zero",
    impossibleSuperAdminSearch.pagination.records,
    0,
  );

  // 5. Test empty search with specific non-matching criteria
  const specificNonMatchingSearch =
    await api.functional.communityPlatform.admin.admins.index(connection, {
      body: {
        search: "completely_nonexistent_admin_name",
        admin_level: "system", // Different from created admin level
        is_super_admin: true, // Different from created admin status
        page: 2,
        limit: 15,
      } satisfies ICommunityPlatformAdmin.IRequest,
    });
  typia.assert(specificNonMatchingSearch);
  TestValidator.equals(
    "specific non-matching search should return zero records",
    specificNonMatchingSearch.data.length,
    0,
  );
  TestValidator.equals(
    "specific non-matching search pagination records should be zero",
    specificNonMatchingSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "specific non-matching search pagination pages should be zero",
    specificNonMatchingSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "specific non-matching search pagination current page should match request",
    specificNonMatchingSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "specific non-matching search pagination limit should match request",
    specificNonMatchingSearch.pagination.limit,
    15,
  );
}
