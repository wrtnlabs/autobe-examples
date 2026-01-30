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
export async function test_api_trending_posts_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to access trending content endpoint
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
  typia.assert(member);
  // Step 2: Retrieve trending posts using authenticated member connection
  const trendingPosts: IPageICommunityBbsTrendingContent =
    await api.functional.communityBbs.member.analytics.posts.trending.index(
      memberConnection,
    );
  typia.assert(trendingPosts);
  // Step 3: Validate response structure matches IPageICommunityBbsTrendingContent
  TestValidator.equals(
    "pagination limit is 20",
    trendingPosts.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current page is 1",
    trendingPosts.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records is positive",
    trendingPosts.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    trendingPosts.pagination.pages > 0,
  );
  TestValidator.predicate(
    "data array has at least one post",
    trendingPosts.data.length > 0,
  );
  // Step 4: Validate trending posts have non-negative trending_score and published_at
  for (const post of trendingPosts.data) {
    TestValidator.predicate(
      "trending_score is not negative",
      post.trending_score >= 0,
    );
    TestValidator.predicate(
      "published_at is valid date-time",
      post.published_at.length > 0,
    );
    TestValidator.predicate("post_id is valid UUID", post.post_id.length > 0);
    TestValidator.predicate(
      "community_id is valid UUID",
      post.community_id.length > 0,
    );
    TestValidator.predicate(
      "author_id is valid UUID",
      post.author_id.length > 0,
    );
    TestValidator.predicate(
      "author_handle is not empty",
      post.author_handle.length > 0,
    );
    TestValidator.predicate(
      "total_upvotes is non-negative",
      post.total_upvotes >= 0,
    );
    TestValidator.predicate(
      "total_downvotes is non-negative",
      post.total_downvotes >= 0,
    );
    TestValidator.predicate(
      "total_comments is non-negative",
      post.total_comments >= 0,
    );
  }
  // Step 5: Verify guest user rejection (unauthenticated access fails)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest user should be rejected", async () => {
    await api.functional.communityBbs.member.analytics.posts.trending.index(
      guestConnection,
    );
  });
}
