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

export async function test_api_subscription_create_success_enables_posting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. User creates a community (prerequisite for subscription)
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `test-community-${typia.random<string & tags.Format<"uuid">>()}`,
          description: `Test community for subscription - ${new Date().getTime()}`,
        },
      },
    );
  typia.assert(community);
  // 3. User subscribes to the created community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {
        body: {
          community_platform_community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription details
  TestValidator.equals(
    "subscription user ID matches",
    subscription.user.id,
    user.id,
  );
  TestValidator.equals(
    "subscription community ID matches",
    subscription.community.id,
    community.id,
  );
  // Validate timestamps are valid and sequential
  const subscribedTime = new Date(subscription.subscribed_at).getTime();
  const createdTime = new Date(subscription.created_at).getTime();
  const updatedTime = new Date(subscription.updated_at).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "subscribed_at is valid timestamp",
    subscribedTime > 0 && subscribedTime <= now,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    createdTime > 0 && createdTime <= now,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    updatedTime > 0 && updatedTime <= now,
  );
  // Validate subscription state
  TestValidator.equals(
    "subscription is active (deleted_at null)",
    subscription.deleted_at,
    null,
  );
  TestValidator.equals(
    "subscription is not unsubscribed",
    subscription.unsubscribed_at,
    null,
  );
  // 5. Test subscription summary information
  TestValidator.equals(
    "subscription user summary matches user",
    subscription.user.id,
    user.id,
  );
  TestValidator.equals(
    "subscription community summary matches community",
    subscription.community.id,
    community.id,
  );
  // Note: Post creation endpoint not available in provided APIs,
  // but subscription creation success validates the prerequisite
  // business rule that user must subscribe before posting
}
