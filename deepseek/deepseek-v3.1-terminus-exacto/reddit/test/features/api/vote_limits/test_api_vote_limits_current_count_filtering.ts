import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteLimit";

/**
 * Test vote limits filtering by current vote count thresholds.
 *
 * Validates that administrators can filter vote limits using min_current_count
 * and max_current_count parameters to retrieve records within specific usage
 * ranges. Tests various count thresholds to ensure accurate usage-based
 * filtering for vote limit monitoring.
 */
export async function test_api_vote_limits_current_count_filtering(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test filtering with specific current count ranges
  // Test case 1: Low usage range (0-10 votes)
  const lowUsageSearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_current_count: 0,
        max_current_count: 10,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(lowUsageSearch);

  // Validate that all returned records fall within the specified range
  TestValidator.predicate(
    "low usage search returns records within 0-10 current count range",
    lowUsageSearch.data.every(
      (record) => record.current_count >= 0 && record.current_count <= 10,
    ),
  );

  // Test case 2: Medium usage range (11-50 votes)
  const mediumUsageSearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_current_count: 11,
        max_current_count: 50,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(mediumUsageSearch);

  // Validate that all returned records fall within the specified range
  TestValidator.predicate(
    "medium usage search returns records within 11-50 current count range",
    mediumUsageSearch.data.every(
      (record) => record.current_count >= 11 && record.current_count <= 50,
    ),
  );

  // Test case 3: High usage range (51-100 votes)
  const highUsageSearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_current_count: 51,
        max_current_count: 100,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(highUsageSearch);

  // Validate that all returned records fall within the specified range
  TestValidator.predicate(
    "high usage search returns records within 51-100 current count range",
    highUsageSearch.data.every(
      (record) => record.current_count >= 51 && record.current_count <= 100,
    ),
  );

  // Test case 4: Boundary testing with minimum threshold only
  const minOnlySearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_current_count: 25,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(minOnlySearch);

  // Validate that all returned records meet the minimum threshold
  TestValidator.predicate(
    "min-only search returns records with current count >= 25",
    minOnlySearch.data.every((record) => record.current_count >= 25),
  );

  // Test case 5: Boundary testing with maximum threshold only
  const maxOnlySearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        max_current_count: 25,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(maxOnlySearch);

  // Validate that all returned records meet the maximum threshold
  TestValidator.predicate(
    "max-only search returns records with current count <= 25",
    maxOnlySearch.data.every((record) => record.current_count <= 25),
  );

  // Test case 6: Empty result set for impossible range
  const impossibleRangeSearch =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        min_current_count: 1000,
        max_current_count: 1001,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(impossibleRangeSearch);

  // Validate that no records are returned for impossible range
  TestValidator.equals(
    "impossible range search returns empty result set",
    impossibleRangeSearch.data.length,
    0,
  );

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination information is valid",
    lowUsageSearch.pagination.current >= 1 &&
      lowUsageSearch.pagination.limit >= 1 &&
      lowUsageSearch.pagination.limit <= 100 &&
      lowUsageSearch.pagination.records >= 0 &&
      lowUsageSearch.pagination.pages >= 0,
  );
}
