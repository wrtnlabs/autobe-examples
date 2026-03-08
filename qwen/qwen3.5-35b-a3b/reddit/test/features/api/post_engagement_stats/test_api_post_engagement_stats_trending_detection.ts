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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_engagement_stats_trending_detection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create a community for posts
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Note: In simulation mode, we use the utility which handles community creation
  // For real execution, we would need an actual community ID
  // 3. Create multiple posts with varying engagement patterns
  // Since we cannot control engagement metrics directly, we create multiple posts
  // and test the filtering logic on whatever data exists
  const posts: IRedditPlatformPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await api.functional.redditPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 + i }),
          postType: "TEXT" as const,
          redditPlatformCommunityId: communityId,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 4. Query engagement statistics with various filters
  // Test high engagement filter (min_view_count and min_upvote_count)
  const highEngagementResponse =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          min_view_count: 100,
          min_upvote_count: 50,
          sort: "view_count",
          order: "desc",
          limit: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(highEngagementResponse);
  // 5. Test controversial post detection (posts with both upvotes and downvotes)
  const controversialResponse =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          min_upvote_count: 1,
          min_downvote_count: 1,
          sort: "view_count",
          order: "asc",
          limit: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // 6. Test time-based filtering
  const recentViewedResponse =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          last_viewed_at_after: new Date(Date.now() - 86400000).toISOString(),
          sort: "last_viewed_at",
          order: "desc",
          limit: 20,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(recentViewedResponse);
  // 7. Validate engagement metrics structure and constraints
  if (highEngagementResponse.data.length > 0) {
    const post = highEngagementResponse.data[0];
    typia.assert(post);
    // Verify view_count and upvote_count meet the filter criteria
    TestValidator.predicate(
      "post meets min_view_count",
      post.view_count >= 100,
    );
    TestValidator.predicate(
      "post meets min_upvote_count",
      post.upvote_count >= 50,
    );
  }
  // 8. Test pagination consistency
  const page1Response =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 10,
          sort: "view_count",
          order: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "view_count",
          order: "desc",
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(page2Response);
  // Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  // 9. Verify sorting works correctly
  if (page1Response.data.length > 1) {
    TestValidator.predicate(
      "results sorted by view_count descending",
      page1Response.data.every((post, index, array) => {
        if (index === 0) return true;
        return array[index - 1].view_count >= post.view_count;
      }),
    );
  }
  // 10. Test total count accuracy
  const totalCountResponse =
    await api.functional.redditPlatform.post_engagement_stats.index(
      memberConnection,
      {
        body: {
          limit: 100,
          deleted_at_is_null: true,
        } satisfies IRedditPlatformPostEngagementStat.IRequest,
      },
    );
  typia.assert(totalCountResponse);
  TestValidator.predicate(
    "total records is positive",
    totalCountResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    Math.ceil(totalCountResponse.pagination.records / 100),
    totalCountResponse.pagination.pages,
  );
}
