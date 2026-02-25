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

export async function test_api_subscription_unsubscribe_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user A
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  typia.assert(userA);
  // 2. User A creates a subscription
  const subscription =
    await generate_random_community_platform_user_subscriptions_create(
      userAConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Authenticate as user B
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // 4. User B tries to delete user A's subscription
  await TestValidator.httpError(
    "unauthorized unsubscribe attempt",
    403,
    async () => {
      await api.functional.communityPlatform.user.subscriptions.erase(
        userBConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
