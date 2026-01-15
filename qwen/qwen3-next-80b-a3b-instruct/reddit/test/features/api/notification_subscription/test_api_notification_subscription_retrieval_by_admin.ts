import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSubscription";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_subscription_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinInput,
  });
  typia.assert(admin);
  // Step 2: Create a notification subscription (via system simulation)
  // Since there's no direct API to create subscription, we simulate the creation
  // by using typia.random to generate a valid subscription
  const subscription =
    typia.random<ICommunityPlatformNotificationSubscription>();
  typia.assert(subscription);
  // Step 3: Retrieve the subscription using the subscriptionId
  const retrievedSubscription =
    await api.functional.communityPlatform.admin.notification_subscriptions.at(
      adminConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // Step 4: Validate all subscription fields
  TestValidator.equals(
    "notification_type matches",
    retrievedSubscription.notification_type,
    subscription.notification_type,
  );
  TestValidator.equals(
    "channel matches",
    retrievedSubscription.channel,
    subscription.channel,
  );
  TestValidator.equals(
    "frequency matches",
    retrievedSubscription.frequency,
    subscription.frequency,
  );
  TestValidator.equals(
    "enabled matches",
    retrievedSubscription.enabled,
    subscription.enabled,
  );
  TestValidator.equals(
    "last_status_changed_at matches",
    retrievedSubscription.last_status_changed_at,
    subscription.last_status_changed_at,
  );
}
