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
 * Test vote limits filtering by actor type (member, moderator, admin).
 *
 * Validates that administrators can filter vote limit records by actor_type
 * parameter, ensuring only limits for the specified actor type are returned.
 * Tests all actor type values to verify accurate actor classification
 * filtering.
 */
export async function test_api_vote_limits_filter_by_actor_type(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Test filtering by each valid actor type
  const actorTypes = ["member", "moderator", "admin"] as const;

  for (const actorType of actorTypes) {
    // Search for vote limits with specific actor type filter
    const searchResult: IPageICommunityPlatformVoteLimit.ISummary =
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            actor_type: actorType,
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    typia.assert(searchResult);

    // Validate pagination structure
    TestValidator.equals(
      `pagination structure for ${actorType} filter`,
      searchResult.pagination,
      {
        current: searchResult.pagination.current,
        limit: searchResult.pagination.limit,
        records: searchResult.pagination.records,
        pages: searchResult.pagination.pages,
      } satisfies IPage.IPagination,
    );

    // Validate that all returned records match the specified actor type
    for (const voteLimit of searchResult.data) {
      TestValidator.equals(
        `vote limit actor type should be ${actorType}`,
        voteLimit.actor_type,
        actorType,
      );

      // Validate vote limit structure
      typia.assert(voteLimit);
    }

    // Test with additional filters combined with actor_type
    const combinedSearchResult: IPageICommunityPlatformVoteLimit.ISummary =
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 5,
            actor_type: actorType,
            sort_by: "current_count",
            order: "asc",
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    typia.assert(combinedSearchResult);

    // Validate combined filter results
    for (const voteLimit of combinedSearchResult.data) {
      TestValidator.equals(
        `combined filter actor type should be ${actorType}`,
        voteLimit.actor_type,
        actorType,
      );
    }
  }

  // 3. Test without actor_type filter (should return all types)
  const allResults: IPageICommunityPlatformVoteLimit.ISummary =
    await api.functional.communityPlatform.admin.voteLimits.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVoteLimit.IRequest,
    });
  typia.assert(allResults);

  // Validate pagination for unfiltered results
  TestValidator.predicate(
    "pagination current page should be 1",
    allResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    allResults.pagination.limit === 20,
  );

  // 4. Test invalid actor_type value
  await TestValidator.error(
    "invalid actor_type should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            actor_type: "invalid_actor_type",
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    },
  );

  // 5. Test empty string actor_type
  await TestValidator.error(
    "empty string actor_type should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.voteLimits.index(
        connection,
        {
          body: {
            page: 1,
            limit: 10,
            actor_type: "",
          } satisfies ICommunityPlatformVoteLimit.IRequest,
        },
      );
    },
  );
}
