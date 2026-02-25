import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_analytics_comprehensive_engagement(
  connection: api.IConnection,
): Promise<void> {
  // Create post author user
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await api.functional.communityPlatform.user.communities.create(
      authorConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post
  const post = await api.functional.communityPlatform.user.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve analytics
  const analytics = await api.functional.communityPlatform.user.posts.analytics(
    authorConnection,
    { postId: post.id },
  );
  typia.assert(analytics);
  // Validate analytics structure
  TestValidator.predicate(
    "total_views is number",
    typeof analytics.total_views === "number",
  );
  TestValidator.predicate(
    "unique_viewers is number",
    typeof analytics.unique_viewers === "number",
  );
  TestValidator.predicate(
    "upvotes is number",
    typeof analytics.upvotes === "number",
  );
  TestValidator.predicate(
    "downvotes is number",
    typeof analytics.downvotes === "number",
  );
  TestValidator.predicate(
    "total_score is number",
    typeof analytics.total_score === "number",
  );
  TestValidator.predicate(
    "total_comments is number",
    typeof analytics.total_comments === "number",
  );
  // Validate non-negative values
  TestValidator.predicate(
    "total_views non-negative",
    analytics.total_views >= 0,
  );
  TestValidator.predicate(
    "unique_viewers non-negative",
    analytics.unique_viewers >= 0,
  );
  TestValidator.predicate(
    "total_comments non-negative",
    analytics.total_comments >= 0,
  );
  // Validate score calculation consistency
  TestValidator.equals(
    "score equals upvotes minus downvotes",
    analytics.total_score,
    analytics.upvotes - analytics.downvotes,
  );
  // Validate unique viewers <= total views
  TestValidator.predicate(
    "unique_viewers <= total_views",
    analytics.unique_viewers <= analytics.total_views,
  );
}
