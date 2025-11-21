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
 * Test vote limits filtering by limit type (hourly, daily, content_type,
 * reputation_based). Validate that administrators can filter vote limit records
 * by limit_type parameter, ensuring only limits of the specified type are
 * returned. Test all limit type values to verify accurate limit type
 * classification.
 */
export async function test_api_vote_limits_filter_by_limit_type(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
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

  // Step 2: Test filtering for each valid limit type
  const validLimitTypes = [
    "hourly",
    "daily",
    "content_type",
    "reputation_based",
  ] as const;

  for (const limitType of validLimitTypes) {
    // Search for vote limits with specific limit type
    const filteredResults =
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            limit_type: limitType,
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    typia.assert(filteredResults);

    // Validate pagination structure regardless of data presence
    TestValidator.equals(
      `pagination structure valid for ${limitType} filter`,
      typeof filteredResults.pagination.current,
      "number",
    );
    TestValidator.predicate(
      `pagination current page should be >= 0 for ${limitType}`,
      filteredResults.pagination.current >= 0,
    );
    TestValidator.predicate(
      `pagination limit should be between 1-100 for ${limitType}`,
      filteredResults.pagination.limit >= 1 &&
        filteredResults.pagination.limit <= 100,
    );
    TestValidator.predicate(
      `pagination records should be >= 0 for ${limitType}`,
      filteredResults.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages should be >= 0 for ${limitType}`,
      filteredResults.pagination.pages >= 0,
    );

    // Validate that all returned records match the filter (if any records exist)
    if (filteredResults.data.length > 0) {
      TestValidator.predicate(
        `all ${limitType} vote limits should have matching limit_type`,
        filteredResults.data.every((record) => record.limit_type === limitType),
      );
    }
  }

  // Step 3: Test with invalid limit type
  await TestValidator.error("should reject invalid limit type", async () => {
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
        limit_type: "invalid_type",
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  });

  // Step 4: Test without filter to get all records
  const allResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(allResults);

  // Validate that unfiltered results contain valid data structure
  TestValidator.predicate(
    "unfiltered search should return valid pagination",
    allResults.pagination.current >= 0 &&
      allResults.pagination.limit >= 1 &&
      allResults.pagination.limit <= 100 &&
      allResults.pagination.records >= 0 &&
      allResults.pagination.pages >= 0,
  );

  // Step 5: Test combination of filters
  const combinedFilterResults =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 5,
        limit_type: "hourly",
        actor_type: "member",
        min_current_count: 0,
        max_current_count: 100,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(combinedFilterResults);

  // Validate combined filter results
  TestValidator.predicate(
    "combined filter should return valid pagination",
    combinedFilterResults.pagination.current >= 0 &&
      combinedFilterResults.pagination.limit >= 1 &&
      combinedFilterResults.pagination.limit <= 100 &&
      combinedFilterResults.pagination.records >= 0 &&
      combinedFilterResults.pagination.pages >= 0,
  );
}
