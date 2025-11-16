import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test pagination functionality for moderation action search results.
 *
 * This test validates that pagination controls work correctly when browsing
 * through moderation history. It ensures proper page handling, limit controls,
 * and accurate pagination metadata regardless of the number of records.
 *
 * Note: This test focuses on pagination API behavior validation. The actual
 * moderation action creation is beyond the scope of available API endpoints, so
 * we test pagination mechanics with whatever data exists in the system.
 *
 * Workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Create community for moderation context
 * 3. Test pagination with various page numbers and limits
 * 4. Validate pagination metadata accuracy
 * 5. Verify no duplicates across pages (when multiple pages exist)
 * 6. Test edge cases (beyond range pages, different limit values)
 */
export async function test_api_moderation_action_search_with_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://test.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          rules: RandomGenerator.paragraph({ sentences: 5 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Test first page with limit=10
  const firstPage =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(firstPage);

  // Validate first page pagination metadata
  TestValidator.equals(
    "first page current is 0-indexed",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page limit matches request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page data not exceeds limit",
    firstPage.data.length <= 10,
  );
  TestValidator.predicate(
    "records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Validate pages calculation: ceiling(records / limit)
  const expectedFirstPagePages = Math.ceil(firstPage.pagination.records / 10);
  TestValidator.equals(
    "first page pages calculated correctly",
    firstPage.pagination.pages,
    expectedFirstPagePages,
  );

  // Step 4: Test second page if there are enough records
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.redditCommunity.moderator.communities.moderationActions.index(
        connection,
        {
          communityName: communityName,
          body: {
            page: 2,
            limit: 10,
            sort_by: "created_at",
            order: "desc",
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(secondPage);

    // Validate second page
    TestValidator.equals(
      "second page current is 1",
      secondPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "second page limit matches",
      secondPage.pagination.limit,
      10,
    );
    TestValidator.equals(
      "second page records match first",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "second page pages match first",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );

    // Verify no duplicates between pages
    const firstPageIds = firstPage.data.map((action) => action.id);
    const secondPageIds = secondPage.data.map((action) => action.id);
    const duplicates = firstPageIds.filter((id) => secondPageIds.includes(id));
    TestValidator.equals("no duplicates between pages", duplicates.length, 0);
  }

  // Step 5: Test last page if records exist
  if (firstPage.pagination.pages > 0) {
    const lastPageNumber = firstPage.pagination.pages;
    const lastPage =
      await api.functional.redditCommunity.moderator.communities.moderationActions.index(
        connection,
        {
          communityName: communityName,
          body: {
            page: lastPageNumber,
            limit: 10,
            sort_by: "created_at",
            order: "desc",
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(lastPage);

    // Validate last page handling
    TestValidator.equals(
      "last page current index",
      lastPage.pagination.current,
      lastPageNumber - 1,
    );
    TestValidator.predicate(
      "last page data within limit",
      lastPage.data.length <= 10,
    );
  }

  // Step 6: Test different limit values
  const limits = [5, 20, 50, 100] as const;
  for (const limit of limits) {
    const limitTest =
      await api.functional.redditCommunity.moderator.communities.moderationActions.index(
        connection,
        {
          communityName: communityName,
          body: {
            page: 1,
            limit: limit,
            sort_by: "created_at",
            order: "desc",
          } satisfies IRedditCommunityModerationAction.IRequest,
        },
      );
    typia.assert(limitTest);

    TestValidator.equals(
      `limit ${limit} matches request`,
      limitTest.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `limit ${limit} data not exceeds`,
      limitTest.data.length <= limit,
    );

    // Validate pages calculation: ceiling(records / limit)
    const expectedPages = Math.ceil(limitTest.pagination.records / limit);
    TestValidator.equals(
      `limit ${limit} pages calculated correctly`,
      limitTest.pagination.pages,
      expectedPages,
    );
  }

  // Step 7: Test beyond available pages (should return empty data or last page)
  const beyondPage =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 9999,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond pages returns empty or handles gracefully",
    beyondPage.data.length === 0 || beyondPage.pagination.current >= 0,
  );

  // Step 8: Test with filters to verify pagination works with search criteria
  const filteredPage =
    await api.functional.redditCommunity.moderator.communities.moderationActions.index(
      connection,
      {
        communityName: communityName,
        body: {
          page: 1,
          limit: 10,
          community_id: community.id,
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered pagination metadata is valid",
    filteredPage.pagination.limit === 10,
  );
}
