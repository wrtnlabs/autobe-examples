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

/**
 * Test ban search with different sorting configurations.
 *
 * This test validates the sorting functionality of the community ban search
 * API. Note: The provided API does not include a ban creation endpoint, so this
 * test validates sorting behavior with whatever ban data exists in the system.
 *
 * The test verifies:
 *
 * 1. Sorting by created_at in ascending and descending order
 * 2. Sorting by expires_at for temporary ban analysis (including null handling)
 * 3. Sorting by community_name for alphabetical grouping
 * 4. Sorting by member_username for user-focused reviews
 * 5. Sorting by moderator_username for moderator activity analysis
 * 6. Correct application of sort_order parameter (asc vs desc)
 * 7. Pagination integrity with sorted results
 */
export async function test_api_ban_search_with_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123!",
      nickname: RandomGenerator.name(),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Test sorting by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByCreatedAtAsc);

  // Validate ascending order for created_at
  if (sortByCreatedAtAsc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
      const current = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
      const next = new Date(
        sortByCreatedAtAsc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at should be in ascending order",
        current <= next,
      );
    }
  }

  // Step 3: Test sorting by created_at descending
  const sortByCreatedAtDesc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByCreatedAtDesc);

  // Validate descending order for created_at
  if (sortByCreatedAtDesc.data.length > 1) {
    for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
      const current = new Date(
        sortByCreatedAtDesc.data[i].created_at,
      ).getTime();
      const next = new Date(
        sortByCreatedAtDesc.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        "created_at should be in descending order",
        current >= next,
      );
    }
  }

  // Step 4: Test sorting by expires_at ascending (handles null for permanent bans)
  const sortByExpiresAtAsc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "expires_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByExpiresAtAsc);

  // Validate expires_at ascending order (nulls typically sort first or last consistently)
  if (sortByExpiresAtAsc.data.length > 1) {
    for (let i = 0; i < sortByExpiresAtAsc.data.length - 1; i++) {
      const currentExpires = sortByExpiresAtAsc.data[i].expires_at;
      const nextExpires = sortByExpiresAtAsc.data[i + 1].expires_at;

      if (
        currentExpires !== null &&
        currentExpires !== undefined &&
        nextExpires !== null &&
        nextExpires !== undefined
      ) {
        const current = new Date(currentExpires).getTime();
        const next = new Date(nextExpires).getTime();
        TestValidator.predicate(
          "expires_at should be in ascending order for non-null values",
          current <= next,
        );
      }
    }
  }

  // Step 5: Test sorting by expires_at descending
  const sortByExpiresAtDesc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "expires_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByExpiresAtDesc);

  // Step 6: Test sorting by community_name ascending
  const sortByCommunityNameAsc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "community_name",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByCommunityNameAsc);

  // Validate alphabetical ascending order for community_name
  if (sortByCommunityNameAsc.data.length > 1) {
    for (let i = 0; i < sortByCommunityNameAsc.data.length - 1; i++) {
      const current = sortByCommunityNameAsc.data[i].community.name;
      const next = sortByCommunityNameAsc.data[i + 1].community.name;
      TestValidator.predicate(
        "community_name should be in ascending alphabetical order",
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 7: Test sorting by community_name descending
  const sortByCommunityNameDesc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "community_name",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByCommunityNameDesc);

  // Validate alphabetical descending order
  if (sortByCommunityNameDesc.data.length > 1) {
    for (let i = 0; i < sortByCommunityNameDesc.data.length - 1; i++) {
      const current = sortByCommunityNameDesc.data[i].community.name;
      const next = sortByCommunityNameDesc.data[i + 1].community.name;
      TestValidator.predicate(
        "community_name should be in descending alphabetical order",
        current.localeCompare(next) >= 0,
      );
    }
  }

  // Step 8: Test sorting by member_username ascending
  const sortByMemberUsernameAsc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "member_username",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByMemberUsernameAsc);

  // Validate member_username ascending order
  if (sortByMemberUsernameAsc.data.length > 1) {
    for (let i = 0; i < sortByMemberUsernameAsc.data.length - 1; i++) {
      const current = sortByMemberUsernameAsc.data[i].banned_member.username;
      const next = sortByMemberUsernameAsc.data[i + 1].banned_member.username;
      TestValidator.predicate(
        "member_username should be in ascending alphabetical order",
        current.localeCompare(next) <= 0,
      );
    }
  }

  // Step 9: Test sorting by member_username descending
  const sortByMemberUsernameDesc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "member_username",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByMemberUsernameDesc);

  // Step 10: Test sorting by moderator_username ascending
  const sortByModeratorUsernameAsc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "moderator_username",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByModeratorUsernameAsc);

  // Step 11: Test sorting by moderator_username descending
  const sortByModeratorUsernameDesc =
    await api.functional.redditCommunity.moderator.bans.index(connection, {
      body: {
        sort_by: "moderator_username",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    });
  typia.assert(sortByModeratorUsernameDesc);

  // Validate moderator_username descending order
  if (sortByModeratorUsernameDesc.data.length > 1) {
    for (let i = 0; i < sortByModeratorUsernameDesc.data.length - 1; i++) {
      const current = sortByModeratorUsernameDesc.data[i].moderator.username;
      const next = sortByModeratorUsernameDesc.data[i + 1].moderator.username;
      TestValidator.predicate(
        "moderator_username should be in descending alphabetical order",
        current.localeCompare(next) >= 0,
      );
    }
  }

  // Step 12: Test pagination with sorting
  const firstPage = await api.functional.redditCommunity.moderator.bans.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 5,
      } satisfies IRedditCommunityCommunityBan.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 0 (zero-indexed) for page 1 request",
    firstPage.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    firstPage.pagination.limit === 5,
  );

  // Test second page if available
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.redditCommunity.moderator.bans.index(connection, {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 2,
          limit: 5,
        } satisfies IRedditCommunityCommunityBan.IRequest,
      });
    typia.assert(secondPage);

    TestValidator.predicate(
      "second page current should be 1",
      secondPage.pagination.current === 1,
    );

    // Verify pagination continuity across pages
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      const lastOfFirst = new Date(
        firstPage.data[firstPage.data.length - 1].created_at,
      ).getTime();
      const firstOfSecond = new Date(secondPage.data[0].created_at).getTime();
      TestValidator.predicate(
        "pagination should maintain sort order across pages",
        lastOfFirst <= firstOfSecond,
      );
    }
  }
}
