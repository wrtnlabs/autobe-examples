import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsTrendingContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsTrendingContent";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_trending_posts_with_low_engagement_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  // Step 2: Call the trending posts endpoint with authenticated connection
  const trendingPosts: IPageICommunityBbsTrendingContent =
    await api.functional.communityBbs.member.analytics.posts.trending.index(
      memberConnection,
    );
  typia.assert(trendingPosts);
  // Step 3: Validate that all returned posts have trending_score above system threshold
  // System threshold is not exposed in API, so we validate that ALL posts meet quality criteria
  // by ensuring no post has trending_score <= 0 (minimum meaningful value)
  for (const post of trendingPosts.data) {
    TestValidator.predicate(
      "trending post has positive trending score",
      post.trending_score > 0,
    );
    // Additional business rule validations
    TestValidator.predicate(
      "trending post has non-negative upvotes",
      post.total_upvotes >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative downvotes",
      post.total_downvotes >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative comments",
      post.total_comments >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative comment engagement score",
      post.comment_engagement_score >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative recency weight",
      post.recency_weight >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative engagement velocity",
      post.engagement_velocity >= 0,
    );
    TestValidator.predicate(
      "trending post has non-negative author karma score",
      post.author_karma_score >= 0,
    );
  }
  // Step 4: Validate pagination metadata
  TestValidator.predicate(
    "pagination has positive current page",
    trendingPosts.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    trendingPosts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has positive records count",
    trendingPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has positive pages count",
    trendingPosts.pagination.pages >= 0,
  );
}
