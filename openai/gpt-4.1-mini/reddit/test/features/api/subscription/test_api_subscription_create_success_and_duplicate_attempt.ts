import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_community_platform_user_subscriptions_create } from "../../../generate/generate_random_community_platform_user_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_subscription_create_success_and_duplicate_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and gets authorized
  const userConnection: api.IConnection = { host: connection.host };
  const user: ICommunityPlatformUser.IAuthorized = await authorize_user_join(
    userConnection,
    { body: undefined },
  );
  userConnection.headers = { Authorization: user.token.access };
  // 2. Generate a subscription to a random community
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      { body: undefined },
    );
  typia.assert(subscription);
  // 3. Validate that subscription user_id matches authorized user id
  TestValidator.equals(
    "subscription user_id matches authorized user",
    subscription.user_id,
    user.id,
  );
  // 4. Validate that id and community_id are non-empty strings and timestamps present
  TestValidator.predicate(
    "subscription id is non-empty string",
    typeof subscription.id === "string" && subscription.id.length > 0,
  );
  TestValidator.predicate(
    "subscription community_id is non-empty string",
    typeof subscription.community_id === "string" &&
      subscription.community_id.length > 0,
  );
  TestValidator.predicate(
    "subscription created_at is valid ISO datetime",
    typeof subscription.created_at === "string" &&
      subscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated_at is valid ISO datetime",
    typeof subscription.updated_at === "string" &&
      subscription.updated_at.length > 0,
  );
  // 5. Attempt duplicate subscription: Should raise error
  await TestValidator.error(
    "duplicate subscription attempt should fail",
    async () => {
      await generate_random_community_platform_user_subscriptions_create(
        userConnection,
        {
          body: { communityCode: subscription.community_id },
        },
      );
    },
  );
}
