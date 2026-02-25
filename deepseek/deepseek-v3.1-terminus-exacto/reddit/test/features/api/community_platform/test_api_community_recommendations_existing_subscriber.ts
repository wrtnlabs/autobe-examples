import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test personalized recommendations for a user with existing community subscriptions and content engagement.
 * Authenticate as a user, create multiple communities, subscribe to some but not all, create posts/comments
 * to generate engagement history, then request recommendations. Validate that the recommendation algorithm
 * considers user interests based on subscription patterns and content engagement. Check that recommendations
 * exclude communities the user is already subscribed to (as per specification). Verify that communities with
 * high growth rates and activity levels are prioritized. Test that the diversity algorithm provides varied
 * recommendations. Verify response structure and pagination. Test edge cases: user subscribed to all available
 * communities (should return empty or minimal recommendations), user with mixed activity across topics.
 */
export async function test_api_community_recommendations_existing_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate user
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // 2. Create multiple communities
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 5; i++) {
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `community-${RandomGenerator.alphaNumeric(8)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            icon_url: typia.random<string & tags.Format<"uri">>(),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Subscribe user to some communities (not all)
  const subscribedCommunityIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const subscription =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: {
            community_platform_community_id: communities[i].id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
    subscribedCommunityIds.push(communities[i].id);
  }
  // 4. Create posts and comments in subscribed communities for engagement history
  for (const communityId of subscribedCommunityIds) {
    // Find community by ID to get name
    const community = communities.find((c) => c.id === communityId);
    if (!community) continue;
    // Create post
    const post = await generate_random_community_platform_user_posts_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          post_type: "text" as const,
          text_content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    // Create comment on the post
    const comment =
      await generate_random_community_platform_user_posts_comments_create(
        userConnection,
        {
          params: { postId: post.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
  }
  // 5. Request recommendations
  const recommendations =
    await api.functional.communityPlatform.user.communities.recommendations(
      userConnection,
    );
  typia.assert(recommendations);
  // 6. Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    recommendations.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(recommendations.data),
  );
  TestValidator.equals(
    "pagination has current page",
    typeof recommendations.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof recommendations.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof recommendations.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof recommendations.pagination.pages,
    "number",
  );
  // 7. Validate that recommendations exclude subscribed communities
  for (const recommendedCommunity of recommendations.data) {
    TestValidator.predicate(
      "recommendation excludes subscribed community",
      !subscribedCommunityIds.includes(recommendedCommunity.id),
    );
  }
  // 8. Validate recommendation diversity (if multiple recommendations)
  if (recommendations.data.length > 1) {
    const communityIds = recommendations.data.map((c) => c.id);
    const uniqueIds = new Set(communityIds);
    TestValidator.predicate(
      "recommendations provide varied communities",
      uniqueIds.size === communityIds.length,
    );
  }
  // 9. Validate recommendation content structure
  for (const community of recommendations.data) {
    TestValidator.predicate(
      "community has id",
      typeof community.id === "string",
    );
    TestValidator.predicate(
      "community has name",
      typeof community.name === "string",
    );
    TestValidator.predicate(
      "community has description",
      typeof community.description === "string",
    );
    TestValidator.predicate(
      "community icon_url is string or null",
      community.icon_url === null || typeof community.icon_url === "string",
    );
    TestValidator.predicate(
      "community has owner",
      community.owner !== undefined,
    );
    TestValidator.predicate(
      "community has created_at",
      typeof community.created_at === "string",
    );
  }
}