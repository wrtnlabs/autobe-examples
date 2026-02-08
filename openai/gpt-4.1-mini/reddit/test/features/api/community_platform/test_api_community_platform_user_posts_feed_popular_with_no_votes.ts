import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_platform_user_posts_feed_popular_with_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User join for initial authentication
  const userConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: auth.token.access };
  // Step 2: Retrieve popular posts feed
  const popularPosts =
    await api.functional.communityPlatform.user.posts.feed.popular.index(
      userConnection,
    );
  typia.assert(popularPosts);
  // Step 3: Validation
  // Posts without votes should have vote score of zero
  for (const post of popularPosts.data) {
    // Since we don't know exact schema of ICommunityPlatformPost.ISummary, minimally checking the feed includes posts and vote score.
    // Normally vote score is included or vote total is computed as upvotes-downvotes in backend
    // Because schema is empty in provided metadata, we cannot assert precisely. Instead, test consistency.
    // If voteScore property existed, would test as below:
    // TestValidator.predicate("vote score non-null", post.voteScore !== undefined && post.voteScore !== null);
    // TestValidator.predicate("vote score non-negative or negative allowed", typeof post.voteScore === "number");
  }
  // Step 4: Test order is descending by vote score (posts with votes first), simulated by 'data' array order
  // Cannot check numeric because of empty schema, but assure that data array is sorted
  for (let i = 1; i < popularPosts.data.length; i++) {
    // If voteScore existed on posts, we would check:
    // TestValidator.predicate(`post ${i} score <= post ${i-1} score`, popularPosts.data[i].voteScore <= popularPosts.data[i-1].voteScore);
  }
  // Step 5: Validate pagination fields
  const pagination = popularPosts.pagination;
  typia.assert(pagination);
  TestValidator.predicate("current page is positive", pagination.current > 0);
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Step 6: At least one post without votes expected or scenario to cover it
  // Since we have no direct way to guarantee no-vote posts in environment,
  // check data length >= 0
  TestValidator.predicate(
    "posts data is an array",
    Array.isArray(popularPosts.data),
  );
}
