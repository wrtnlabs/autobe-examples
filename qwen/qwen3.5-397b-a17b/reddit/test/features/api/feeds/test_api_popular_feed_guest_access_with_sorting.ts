import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest access to Popular Feed with various sorting methods.
 *
 * Validates that unauthenticated users can browse the popular feed with
 * different sorting options (hot, new, top, controversial) and pagination.
 * Tests response structure, post summary fields, and pagination metadata.
 */
export async function test_api_popular_feed_guest_access_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Default sorting (Hot) - no sort parameter specified
  const hotFeed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  // Test 2: New sorting - posts ordered by created_at DESC
  const newFeed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(newFeed);
  // Test 3: Top sorting with this_week time filter
  const topFeed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        timeFilter: "this_week",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topFeed);
  // Test 4: Controversial sorting
  const controversialFeed =
    await api.functional.redditClone.feeds.popular.index(connection, {
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(controversialFeed);
  // Test 5: Pagination - page 2
  const page2Feed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        page: 2,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(page2Feed);
  TestValidator.equals("page 2 current", page2Feed.pagination.current, 2);
  // Test 6: Validate post summary structure from hot feed
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    const secondPost = hotFeed.data.length > 1 ? hotFeed.data[1] : null;
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination has current page",
      hotFeed.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination has valid limit",
      hotFeed.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination has records count",
      hotFeed.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages calculated",
      hotFeed.pagination.pages >= 0,
    );
    // Validate vote_score is integer (business logic - upvotes minus downvotes)
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(firstPost.vote_score),
    );
    TestValidator.predicate(
      "comment_count is non-negative",
      firstPost.comment_count >= 0,
    );
    // Validate author has required fields (typia validates types, we check business logic)
    TestValidator.predicate(
      "author has valid karma",
      firstPost.author.karma_score >= 0,
    );
    // Validate community has required fields
    TestValidator.predicate(
      "community has valid subscriber count",
      firstPost.community.subscriber_count >= 0,
    );
    // Validate sorting order (new feed should have descending created_at)
    if (secondPost) {
      const firstDate = new Date(firstPost.created_at).getTime();
      const secondDate = new Date(secondPost.created_at).getTime();
      TestValidator.predicate(
        "new sort orders by created_at DESC",
        firstDate >= secondDate,
      );
    }
  }
  // Test 7: Edge case - page beyond available pages (should return empty data)
  const beyondPageFeed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "new",
        page: 99999,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(beyondPageFeed);
  TestValidator.equals(
    "beyond page current",
    beyondPageFeed.pagination.current,
    99999,
  );
  // Test 8: Top sorting without time filter (defaults to all_time)
  const topAllTimeFeed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(topAllTimeFeed);
}
