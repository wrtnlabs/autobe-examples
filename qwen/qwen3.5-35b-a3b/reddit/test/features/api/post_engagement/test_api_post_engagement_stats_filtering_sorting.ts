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

export async function test_api_post_engagement_stats_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic filtering with post_id
  const postStatsById =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          sortBy: "view_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(postStatsById);
  // 2. Test filtering with multiple postIds
  const randomPostIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const postStatsByIds =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          postIds: randomPostIds,
          minViewCount: 0,
          sortBy: "upvote_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(postStatsByIds);
  // 3. Test date range filtering combined with vote count filters
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = now.toISOString();
  const postStatsWithDates =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          dateFrom,
          dateTo,
          minUpvoteCount: 0,
          maxUpvoteCount: 1000,
          sortBy: "downvote_count",
          sortOrder: "asc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(postStatsWithDates);
  // 4. Test all filter types combined
  const complexFilter =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          postIds: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          minViewCount: 10,
          maxViewCount: 100,
          minUpvoteCount: 5,
          maxUpvoteCount: 50,
          minDownvoteCount: 0,
          maxDownvoteCount: 10,
          dateFrom,
          dateTo,
          sortBy: "created_at",
          sortOrder: "desc",
          page: 1,
          pageSize: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(complexFilter);
  // 5. Test pagination with complex filters
  const paginatedStats =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minViewCount: 0,
          sortBy: "view_count",
          sortOrder: "desc",
          page: 2,
          pageSize: 5,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(paginatedStats);
  // 6. Test sorting when all records have same value
  const sameValueSort =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "view_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sameValueSort);
  // 7. Test sorting with empty result set
  const emptySort =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          sortBy: "view_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(emptySort);
  // 8. Test sorting by last_viewed_at
  const nullLastViewedSort =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "last_viewed_at",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(nullLastViewedSort);
  // 9. Test all 5 sort fields
  const sortFields = [
    "view_count" as const,
    "upvote_count" as const,
    "downvote_count" as const,
    "last_viewed_at" as const,
    "created_at" as const,
  ];
  for (const field of sortFields) {
    const fieldSort =
      await api.functional.redditPlatform.post_engagement_stats.index(
        connection,
        {
          body: {
            sortBy: field,
            sortOrder: "desc",
          } satisfies IRedditPlatformPostEngagementStat.IRequest,
        },
      );
    typia.assert(fieldSort);
  }
  // 10. Test both sort directions for each field
  for (const field of sortFields) {
    for (const direction of ["asc" as const, "desc" as const]) {
      const bidirectionalSort =
        await api.functional.redditPlatform.post_engagement_stats.index(
          connection,
          {
            body: {
              sortBy: field,
              sortOrder: direction,
            } satisfies IRedditPlatformPostEngagementStat.IRequest,
          },
        );
      typia.assert(bidirectionalSort);
    }
  }
  // 11. Analytics use case: retrieve top posts by view count
  const topByViews =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "view_count",
          sortOrder: "desc",
          limit: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(topByViews);
  // 12. Analytics use case: retrieve top posts by engagement
  const topByEngagement =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "upvote_count",
          sortOrder: "desc",
          page: 1,
          pageSize: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(topByEngagement);
  // 13. Analytics use case: find controversial posts
  const controversialPosts =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minUpvoteCount: 10,
          maxUpvoteCount: 100,
          minDownvoteCount: 10,
          maxDownvoteCount: 100,
          sortBy: "downvote_count",
          sortOrder: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(controversialPosts);
  // 14. Analytics use case: get recent engagement
  const recentEngagement =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "last_viewed_at",
          sortOrder: "desc",
          dateFrom,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(recentEngagement);
  // 15. Analytics use case: get stale posts
  const stalePosts =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          sortBy: "last_viewed_at",
          sortOrder: "asc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(stalePosts);
  // 16. Verify total count matches limit on single page
  const paginationCheck =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          minViewCount: 0,
          limit: 100,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(paginationCheck);
  const expectedDataLength = Math.min(
    paginationCheck.pagination.limit,
    paginationCheck.pagination.records,
  );
  TestValidator.equals(
    "data length matches expected",
    paginationCheck.data.length,
    expectedDataLength,
  );
  // 17. Verify pagination metadata math
  const mathCheck =
    await api.functional.redditPlatform.post_engagement_stats.index(
      connection,
      {
        body: {
          limit: 10,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(mathCheck);
  const calculatedPages = Math.ceil(
    mathCheck.pagination.records / mathCheck.pagination.limit,
  );
  TestValidator.equals(
    "pages calculated correctly",
    calculatedPages,
    mathCheck.pagination.pages,
  );
  // 18. Verify each record's id is a valid UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const stat of paginationCheck.data) {
    typia.assert(stat);
    TestValidator.predicate("stat id is valid UUID", uuidRegex.test(stat.id));
  }
  // 19. Verify post references include all required fields
  for (const stat of paginationCheck.data) {
    typia.assert(stat);
    const post = stat.post;
    typia.assert(post);
    TestValidator.equals("post has id", post.id !== undefined, true);
    TestValidator.equals("post has title", post.title !== undefined, true);
    TestValidator.equals(
      "post has post_type",
      post.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      post.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      post.comment_count !== undefined,
      true,
    );
    TestValidator.equals("post has author", post.author !== undefined, true);
    TestValidator.equals(
      "post has community",
      post.community !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      post.created_at !== undefined,
      true,
    );
  }
  // 20. Verify author is IRedditPlatformMember.ISummary
  for (const stat of paginationCheck.data) {
    typia.assert(stat);
    typia.assert(stat.post);
    typia.assert(stat.post.author);
    const author = stat.post.author;
    TestValidator.equals("author has id", author.id !== undefined, true);
    TestValidator.equals(
      "author has username",
      author.username !== undefined,
      true,
    );
    TestValidator.equals(
      "author has display_name",
      author.display_name !== undefined,
      true,
    );
    TestValidator.equals(
      "author has karma_score",
      author.karma_score !== undefined,
      true,
    );
    TestValidator.equals(
      "author has is_active",
      author.is_active !== undefined,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      author.created_at !== undefined,
      true,
    );
  }
  // 21. Verify community is IRedditPlatformCommunity.ISummary
  for (const stat of paginationCheck.data) {
    typia.assert(stat);
    typia.assert(stat.post);
    typia.assert(stat.post.community);
    const community = stat.post.community;
    TestValidator.equals("community has id", community.id !== undefined, true);
    TestValidator.equals(
      "community has name",
      community.name !== undefined,
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      community.subscriber_count !== undefined,
      true,
    );
    TestValidator.equals(
      "community has created_at",
      community.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "community has owner",
      community.owner !== undefined,
      true,
    );
  }
}
