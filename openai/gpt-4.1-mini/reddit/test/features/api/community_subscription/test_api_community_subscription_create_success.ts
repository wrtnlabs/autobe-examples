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
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

export async function test_api_community_subscription_create_success(
  connection: api.IConnection,
): Promise<void> {
  // This test covers a successful creation of a community subscription by an authenticated user.
  // 1. User registration and authentication
  const userJoinConn: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userJoinConn, { body: {} });
  typia.assert(authorizedUser);
  // Create a user connection with authentication token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedUser.token.access },
  };
  // 2. Create a new community subscription with random but controlled data
  const subscription =
    await generate_random_community_platform_user_community_subscriptions_create(
      userConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Validate that the subscription entity is correctly structured
  typia.assert(subscription);
  // 4. (Removed validation on created_at and updated_at because these props don't exist)
  // 5. Validate unique subscription: try to create duplicate subscription and expect error
  await TestValidator.error(
    "duplicate subscription creation should fail",
    async () => {
      await generate_random_community_platform_user_community_subscriptions_create(
        userConnection,
        {},
      );
    },
  );
}
