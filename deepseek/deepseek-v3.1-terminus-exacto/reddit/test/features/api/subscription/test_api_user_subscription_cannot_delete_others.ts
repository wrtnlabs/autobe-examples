import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_user_subscription_cannot_delete_others(
  connection: api.IConnection,
): Promise<void> {
  // User A setup
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorization = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(10),
    },
  });
  typia.assert(userAAuthorization);
  // Create community as User A
  const community =
    await generate_random_community_platform_user_communities_create(
      userAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // User A subscribes to the community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userAConnection,
      {
        body: {
          community_platform_community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  const subscriptionId = subscription.id;
  // User B setup (different user)
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password456",
      username: RandomGenerator.alphabets(10),
    },
  });
  // User B attempts to delete User A's subscription - should fail
  await TestValidator.httpError(
    "User B cannot delete User A's subscription",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        userBConnection,
        { subscriptionId },
      );
    },
  );
  // Test with invalid subscription ID (malformed UUID)
  await TestValidator.httpError(
    "Invalid subscription ID should fail",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        userBConnection,
        {
          subscriptionId: "invalid-uuid",
        } satisfies api.functional.communityPlatform.user.subscriptions.erase.Props,
      );
    },
  );
  // Test with non-existent subscription ID
  await TestValidator.httpError(
    "Non-existent subscription ID should fail",
    [404],
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        userBConnection,
        { subscriptionId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // Verify User A can still delete their own subscription
  await api.functional.communityPlatform.user.subscriptions.erase(
    userAConnection,
    { subscriptionId },
  );
}
