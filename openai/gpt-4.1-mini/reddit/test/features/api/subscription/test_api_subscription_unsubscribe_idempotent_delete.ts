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

export async function test_api_subscription_unsubscribe_idempotent_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. User authentication
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a subscription
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Delete the subscription once
  await api.functional.communityPlatform.user.subscriptions.erase(
    userConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 4. Delete the same subscription again (idempotent)
  await api.functional.communityPlatform.user.subscriptions.erase(
    userConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // Test passed if no errors thrown and idempotence verified
  await TestValidator.predicate("idempotent unsubscribe delete succeeds", true);
}
