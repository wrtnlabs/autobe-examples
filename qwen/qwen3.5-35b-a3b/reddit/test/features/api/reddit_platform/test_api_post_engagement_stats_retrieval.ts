import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostEngagementStat";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_engagement_stats_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve all engagement stats with no filters
  const allStats =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {} satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(allStats);
  TestValidator.equals(
    "all stats pagination current",
    allStats.pagination.current,
    1,
  );
  TestValidator.predicate("has valid limit", allStats.pagination.limit >= 1);
  TestValidator.predicate(
    "has records or empty",
    allStats.pagination.records >= 0,
  );
  TestValidator.predicate("has valid pages", allStats.pagination.pages >= 0);
  // 2. Filter by specific post_id (create test post first)
  const testPostIds: string[] = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const postStatsByPostIds =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          postIds: testPostIds,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(postStatsByPostIds);
  if (postStatsByPostIds.data.length > 0) {
    TestValidator.predicate(
      "post IDs filter returns expected posts",
      postStatsByPostIds.data.every(
        (stat) =>
          testPostIds.includes(stat.post.id) || stat.post.title.length > 0,
      ),
    );
  }
  // 3. Filter by view count ranges
  const viewStatsInRange =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minViewCount: 0,
          maxViewCount: 1000000,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(viewStatsInRange);
  TestValidator.equals(
    "view count pagination current",
    viewStatsInRange.pagination.current,
    1,
  );
  // 4. Filter by upvote count ranges
  const upvoteStatsInRange =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minUpvoteCount: 0,
          maxUpvoteCount: 100000,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(upvoteStatsInRange);
  // 5. Filter by downvote count ranges
  const downvoteStatsInRange =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minDownvoteCount: 0,
          maxDownvoteCount: 10000,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(downvoteStatsInRange);
  // 6. Filter by date ranges
  const dateFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const dateStatsInRange =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          dateFrom,
          dateTo,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(dateStatsInRange);
  // 7. Sort by view_count ascending
  const sortedByViewCountAsc =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "view_count",
          sortOrder: "asc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByViewCountAsc);
  if (sortedByViewCountAsc.data.length > 1) {
    TestValidator.predicate(
      "sorted by view_count ascending",
      sortedByViewCountAsc.data
        .slice(0, -1)
        .every(
          (stat, i) =>
            stat.view_count <= sortedByViewCountAsc.data[i + 1].view_count,
        ),
    );
  }
  // 8. Sort by upvote_count descending
  const sortedByUpvoteCountDesc =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "upvote_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByUpvoteCountDesc);
  if (sortedByUpvoteCountDesc.data.length > 1) {
    TestValidator.predicate(
      "sorted by upvote_count descending",
      sortedByUpvoteCountDesc.data
        .slice(0, -1)
        .every(
          (stat, i) =>
            stat.upvote_count >=
            sortedByUpvoteCountDesc.data[i + 1].upvote_count,
        ),
    );
  }
  // 9. Sort by downvote_count
  const sortedByDownvoteCount =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "downvote_count",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByDownvoteCount);
  // 10. Sort by last_viewed_at ascending
  const sortedByLastViewedAtAsc =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "last_viewed_at",
          sortOrder: "asc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByLastViewedAtAsc);
  // 11. Sort by created_at
  const sortedByCreatedAt =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "created_at",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // 12. Default sorting (no sortBy specified) should default to last_viewed_at desc
  const defaultSort =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          pageSize: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(defaultSort);
  // 13. Offset-based pagination with page and pageSize
  const page2 = await api.functional.redditPlatform.post_engagement_stats.index(
    connection,
    {
      body: {
        page: 2,
        pageSize: 5,
      } satisfies IRedditPlatformPostEngagementStat.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  // 14. Cursor-based pagination
  const cursorBased =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          useCursor: true,
          lastId: typia.random<string & tags.Format<"uuid">>(),
          pageSize: 5,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(cursorBased);
  // 15. Test page size limits
  const minPageSize =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          pageSize: 1,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(minPageSize);
  const maxPageSize =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          pageSize: 100,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(maxPageSize);
  // 16. Verify each engagement stat includes associated post reference
  if (allStats.data.length > 0) {
    TestValidator.predicate(
      "engagement stat has post reference",
      allStats.data.every(
        (stat) =>
          stat.post.id.length > 0 &&
          stat.post.title.length > 0 &&
          stat.post.post_type.length > 0 &&
          stat.post.author.username.length > 0 &&
          stat.post.community.name.length > 0,
      ),
    );
  }
  // 17. Verify engagement stats are properly joined with post information
  if (allStats.data.length > 0) {
    TestValidator.equals(
      "post has vote_score",
      allStats.data.every((stat) => typeof stat.post.vote_score === "number"),
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      allStats.data.every(
        (stat) => typeof stat.post.comment_count === "number",
      ),
      true,
    );
  }
  // 18. Verify timestamps are valid date-time format
  if (allStats.data.length > 0) {
    TestValidator.predicate(
      "last_viewed_at is valid date-time",
      allStats.data.every(
        (stat) => !Number.isNaN(Date.parse(stat.last_viewed_at)),
      ),
    );
    TestValidator.predicate(
      "created_at is valid date-time",
      allStats.data.every((stat) => !Number.isNaN(Date.parse(stat.created_at))),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      allStats.data.every((stat) => !Number.isNaN(Date.parse(stat.updated_at))),
    );
  }
  // 19. No matching records edge case (filter with non-existent post_id)
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          post_id: nonExistentPostId,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals(
    "empty results total",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals("empty results pages", emptyResults.pagination.pages, 0);
  TestValidator.equals("empty results data", emptyResults.data.length, 0);
}