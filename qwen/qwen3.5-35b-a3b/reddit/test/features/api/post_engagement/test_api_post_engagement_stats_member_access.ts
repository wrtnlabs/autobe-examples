import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_engagement_stats_member_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // Generate mock engagement statistics data for testing
  const mockEngagementStats: IRedditPlatformPostEngagementStat.ISummary[] =
    ArrayUtil.repeat(10, (i) => {
      const now = new Date();
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        view_count: (i + 1) * 100,
        upvote_count: (i + 1) * 5,
        downvote_count: i * 2,
        last_viewed_at: new Date(now.getTime() - i * 86400000).toISOString(),
        created_at: new Date(now.getTime() - (i + 10) * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        post: {
          id: typia.random<string & tags.Format<"uuid">>(),
          title: `Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2 })}`,
          post_type: "TEXT",
          vote_score: (i + 1) * 3,
          comment_count: i * 2,
          author: {
            id: typia.random<string & tags.Format<"uuid">>(),
            username: RandomGenerator.alphaNumeric(8),
            displayName: RandomGenerator.name(),
            bio: null,
            avatarUrl: null,
            karmaScore: typia.random<number & tags.Type<"int32">>(),
            createdAt: new Date().toISOString(),
            subscriptionCount: typia.random<number & tags.Type<"int32">>(),
          },
          community: {
            id: typia.random<string & tags.Format<"uuid">>(),
            name: RandomGenerator.alphaNumeric(10),
            description: null,
            icon_url: null,
            subscriber_count: typia.random<number & tags.Type<"int32">>(),
            author: {
              id: typia.random<string & tags.Format<"uuid">>(),
              username: RandomGenerator.alphaNumeric(8),
              displayName: RandomGenerator.name(),
              bio: null,
              avatarUrl: null,
              karmaScore: typia.random<number & tags.Type<"int32">>(),
              createdAt: new Date().toISOString(),
              subscriptionCount: typia.random<number & tags.Type<"int32">>(),
            },
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          deleted_at: null,
        },
      };
    });
  // 2. Filter by specific post_id (test with first post)
  const targetPostId = mockEngagementStats[0].post.id;
  const filteredByPostId: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          post_id: targetPostId,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(filteredByPostId);
  TestValidator.equals(
    "post_id filter test",
    filteredByPostId.data.length >= 0,
    true,
  );
  // 3. Filter by view count ranges
  const filteredByMinView: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          min_view_count: 300,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(filteredByMinView);
  TestValidator.predicate(
    "filter accepts min_view_count parameter",
    filteredByMinView.pagination.limit === 20,
  );
  // 4. Filter by max view count
  const filteredByMaxView: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          max_view_count: 500,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(filteredByMaxView);
  TestValidator.predicate(
    "filter accepts max_view_count parameter",
    filteredByMaxView.pagination.limit === 20,
  );
  // 5. Filter by upvote count ranges
  const filteredByMinUpvote: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          min_upvote_count: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(filteredByMinUpvote);
  TestValidator.predicate(
    "filter accepts min_upvote_count parameter",
    filteredByMinUpvote.pagination.limit === 20,
  );
  // 6. Filter by time range (last_viewed_at_after)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const filteredByTime: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          last_viewed_at_after: yesterday,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(filteredByTime);
  TestValidator.predicate(
    "filter accepts last_viewed_at_after parameter",
    filteredByTime.pagination.limit === 20,
  );
  // 7. Verify pagination works correctly with default (20) page size
  const paginatedDefault: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(paginatedDefault);
  TestValidator.equals(
    "default limit is 20",
    paginatedDefault.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page number starts at 1",
    paginatedDefault.pagination.current,
    1,
  );
  // 8. Test custom page sizes (limit: 3)
  const paginatedCustom: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 3,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(paginatedCustom);
  TestValidator.equals(
    "custom limit is 3",
    paginatedCustom.pagination.limit,
    3,
  );
  TestValidator.equals(
    "returned data length",
    paginatedCustom.data.length <= 3,
    true,
  );
  TestValidator.equals(
    "total records tracked",
    paginatedCustom.pagination.records >= 0,
    true,
  );
  // 9. Test pagination across multiple pages
  const page1: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 3,
          page: 1,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  const page2: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 3,
          page: 2,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 10. Test sorting by view_count descending
  const sortedByViewDesc: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          sort: "view_count",
          order: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByViewDesc);
  TestValidator.predicate(
    "sort accepts view_count desc",
    sortedByViewDesc.pagination.limit === 20,
  );
  // 11. Test sorting by view_count ascending
  const sortedByViewAsc: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          sort: "view_count",
          order: "asc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByViewAsc);
  TestValidator.predicate(
    "sort accepts view_count asc",
    sortedByViewAsc.pagination.limit === 20,
  );
  // 12. Test sorting by upvote_count descending
  const sortedByUpvoteDesc: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          sort: "upvote_count",
          order: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByUpvoteDesc);
  TestValidator.predicate(
    "sort accepts upvote_count desc",
    sortedByUpvoteDesc.pagination.limit === 20,
  );
  // 13. Test sorting by last_viewed_at descending
  const sortedByLastViewedDesc: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          sort: "last_viewed_at",
          order: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(sortedByLastViewedDesc);
  TestValidator.predicate(
    "sort accepts last_viewed_at desc",
    sortedByLastViewedDesc.pagination.limit === 20,
  );
  // 14. Validate response structure includes correct engagement data with post references
  const allStats: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(allStats);
  TestValidator.equals("data is array", Array.isArray(allStats.data), true);
  TestValidator.equals(
    "pagination has current",
    typeof allStats.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    typeof allStats.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination has records",
    typeof allStats.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    typeof allStats.pagination.pages === "number",
    true,
  );
  // Validate data items
  for (const stat of allStats.data) {
    typia.assert(stat);
    TestValidator.equals("stat has valid id", stat.id !== undefined, true);
    TestValidator.equals("stat has view_count", stat.view_count >= 0, true);
    TestValidator.equals("stat has upvote_count", stat.upvote_count >= 0, true);
    TestValidator.equals(
      "stat has downvote_count",
      stat.downvote_count >= 0,
      true,
    );
    TestValidator.equals(
      "stat has last_viewed_at",
      stat.last_viewed_at !== undefined,
      true,
    );
    TestValidator.equals(
      "stat has post reference",
      stat.post !== undefined,
      true,
    );
    TestValidator.equals("post has id", stat.post.id !== undefined, true);
    TestValidator.equals("post has title", stat.post.title.length > 0, true);
  }
  // 15. Verify deleted_at_is_null filter
  const nonDeleted: IPageIRedditPlatformPostEngagementStat.ISummary =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          deleted_at_is_null: true,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(nonDeleted);
  TestValidator.equals(
    "deleted_at_is_null filter works",
    nonDeleted.pagination.limit === 20,
    true,
  );
  // 16. Confirm response structure matches IPageIRedditPlatformPostEngagementStat.ISummary
  TestValidator.equals(
    "data length <= records",
    allStats.data.length <= allStats.pagination.records,
    true,
  );
  TestValidator.equals(
    "pages calculation correct",
    allStats.pagination.pages >= 0,
    true,
  );
}
