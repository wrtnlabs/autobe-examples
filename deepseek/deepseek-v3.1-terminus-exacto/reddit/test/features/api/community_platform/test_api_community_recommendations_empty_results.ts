import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_recommendations_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  // Get initial recommendations to establish baseline
  const initialRecommendations =
    await api.functional.communityPlatform.user.communities.recommendations(
      userConnection,
    );
  typia.assert(initialRecommendations);
  // Create and subscribe to multiple communities to simulate "subscribed to all" scenario
  const subscribedCommunities = await ArrayUtil.asyncRepeat(3, async () => {
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 2,
              wordMax: 4,
            }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    // Subscribe to the community
    const subscription =
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: {
            community_platform_community_id: community.id,
          } satisfies ICommunityPlatformCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
    return community;
  });
  // Get recommendations after subscribing to communities
  const recommendationsAfterSubscription =
    await api.functional.communityPlatform.user.communities.recommendations(
      userConnection,
    );
  typia.assert(recommendationsAfterSubscription);
  // Validate that recommendations handle the scenario gracefully
  TestValidator.predicate(
    "recommendations should be valid pagination response",
    recommendationsAfterSubscription.pagination.records >= 0 &&
      recommendationsAfterSubscription.pagination.pages >= 0 &&
      recommendationsAfterSubscription.pagination.current >= 0 &&
      recommendationsAfterSubscription.pagination.limit > 0,
  );
  // Validate that data array exists and is properly typed
  TestValidator.predicate(
    "recommendations data should be an array",
    Array.isArray(recommendationsAfterSubscription.data),
  );
  // Test that system handles empty/minimal results without errors
  recommendationsAfterSubscription.data.forEach((community) => {
    typia.assert(community);
    TestValidator.predicate(
      "community summary should have required fields",
      typeof community.id === "string" &&
        typeof community.name === "string" &&
        typeof community.description === "string" &&
        typeof community.created_at === "string",
    );
  });
  // Create a new community that user is NOT subscribed to
  const newCommunity =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(newCommunity);
  // Get recommendations again to test cache/stale data handling
  const finalRecommendations =
    await api.functional.communityPlatform.user.communities.recommendations(
      userConnection,
    );
  typia.assert(finalRecommendations);
  // Validate final recommendations structure
  TestValidator.predicate(
    "final recommendations should have valid pagination",
    finalRecommendations.pagination.records >= 0 &&
      finalRecommendations.pagination.pages >= 0 &&
      finalRecommendations.pagination.current >= 0 &&
      finalRecommendations.pagination.limit > 0,
  );
  TestValidator.predicate(
    "final recommendations data should be an array",
    Array.isArray(finalRecommendations.data),
  );
}
