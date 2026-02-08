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

export async function test_api_community_subscription_deletion_by_subscriber(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user and authorize
  const userConnection1: api.IConnection = { host: connection.host };
  const authorized1 = await authorize_user_join(userConnection1, { body: {} });
  typia.assert(authorized1);
  userConnection1.headers = { Authorization: authorized1.token.access };
  // 2. Create second user and authorize
  const userConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_user_join(userConnection2, { body: {} });
  typia.assert(authorized2);
  userConnection2.headers = { Authorization: authorized2.token.access };
  // 3. Subscribe first user to a community
  const subscriptionRaw = await generate_random_community_platform_user_community_subscriptions_create(
    userConnection1,
    { body: {} },
  );
  const subscription = typia.assert(
    subscriptionRaw as ICommunityPlatformCommunitySubscription & { id: string },
  );
  // 4. First user deletes their own subscription
  await api.functional.communityPlatform.user.community_subscriptions.erase(
    userConnection1,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Verify that deletion was successful by attempting to delete again and expect an error
  await TestValidator.httpError(
    "delete non-existent subscription",
    404,
    async () => {
      await api.functional.communityPlatform.user.community_subscriptions.erase(
        userConnection1,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 6. Create a new subscription again for testing unauthorized deletion
  const newSubscriptionRaw = await generate_random_community_platform_user_community_subscriptions_create(
    userConnection1,
    { body: {} },
  );
  const newSubscription = typia.assert(
    newSubscriptionRaw as ICommunityPlatformCommunitySubscription & { id: string },
  );
  // 7. Second user tries to delete first user's subscription and expect authorization error
  await TestValidator.httpError(
    "unauthorized delete attempt",
    403,
    async () => {
      await api.functional.communityPlatform.user.community_subscriptions.erase(
        userConnection2,
        {
          subscriptionId: newSubscription.id,
        },
      );
    },
  );
}
