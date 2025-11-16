import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_member_ban_history_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create test username for the test member
  const testUsername = RandomGenerator.alphaNumeric(12);

  // Step 3: Execute combined filter test - status + community_name
  const statusAndCommunityFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          community_name: "test_community",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(statusAndCommunityFilter);

  // Validate that all returned bans match BOTH filters
  for (const ban of statusAndCommunityFilter.data) {
    TestValidator.equals("ban status matches filter", ban.status, "active");
    TestValidator.equals(
      "ban community matches filter",
      ban.community.name,
      "test_community",
    );
  }

  // Step 4: Test status + date range combination
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const statusAndDateFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          created_from: thirtyDaysAgo.toISOString(),
          created_to: now.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(statusAndDateFilter);

  // Validate combined filters
  for (const ban of statusAndDateFilter.data) {
    TestValidator.equals("ban status is active", ban.status, "active");
    const banDate = new Date(ban.created_at);
    TestValidator.predicate(
      "ban created within date range",
      banDate >= thirtyDaysAgo && banDate <= now,
    );
  }

  // Step 5: Test three-way combination - status + community + permanence
  const tripleFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          community_name: "test_community",
          is_permanent: true,
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(tripleFilter);

  // Validate all three filters are applied
  for (const ban of tripleFilter.data) {
    TestValidator.equals("status filter applied", ban.status, "active");
    TestValidator.equals(
      "community filter applied",
      ban.community.name,
      "test_community",
    );
    TestValidator.equals("permanence filter applied", ban.is_permanent, true);
  }

  // Step 6: Test complex multi-filter combination
  const complexFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          community_name: "test_community",
          is_permanent: false,
          created_from: thirtyDaysAgo.toISOString(),
          created_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(complexFilter);

  // Validate all filters in complex scenario
  for (const ban of complexFilter.data) {
    TestValidator.equals("complex: status active", ban.status, "active");
    TestValidator.equals(
      "complex: community matches",
      ban.community.name,
      "test_community",
    );
    TestValidator.equals("complex: not permanent", ban.is_permanent, false);
    const banDate = new Date(ban.created_at);
    TestValidator.predicate(
      "complex: within date range",
      banDate >= thirtyDaysAgo && banDate <= now,
    );
  }

  // Step 7: Test edge case - filters that may return empty results
  const edgeCaseFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          is_permanent: true,
          expires_from: now.toISOString(),
          expires_to: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(edgeCaseFilter);

  // Validate edge case: permanent bans should not have expiration dates
  // This combination should logically return empty or only validate permanent bans have null expiration
  for (const ban of edgeCaseFilter.data) {
    if (ban.is_permanent) {
      TestValidator.equals(
        "permanent ban has null expiration",
        ban.expires_at,
        null,
      );
    }
  }

  // Step 8: Test progressive filtering - verify narrowing effect
  const baselineFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(baselineFilter);

  const oneFilterResult =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(oneFilterResult);

  const twoFilterResult =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          community_name: "test_community",
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(twoFilterResult);

  // Validate progressive narrowing
  TestValidator.predicate(
    "one filter narrows or maintains count",
    oneFilterResult.pagination.records <= baselineFilter.pagination.records,
  );
  TestValidator.predicate(
    "two filters narrows or maintains count",
    twoFilterResult.pagination.records <= oneFilterResult.pagination.records,
  );

  // Step 9: Test with different statuses
  const statusValues = ["active", "expired", "appealed", "lifted"] as const;

  for (const status of statusValues) {
    const statusSpecificFilter =
      await api.functional.redditCommunity.moderator.members.bans.index(
        connection,
        {
          username: testUsername,
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityCommunityBan.IRequest,
        },
      );
    typia.assert(statusSpecificFilter);

    // Validate all returned bans have the requested status
    for (const ban of statusSpecificFilter.data) {
      TestValidator.equals(`status matches ${status}`, ban.status, status);
    }
  }

  // Step 10: Test pagination with filters
  const paginatedFilter =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(paginatedFilter);

  // Validate pagination metadata (current is zero-based index)
  TestValidator.equals(
    "pagination current index is 0",
    paginatedFilter.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginatedFilter.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array respects limit",
    paginatedFilter.data.length <= 5,
  );
}
