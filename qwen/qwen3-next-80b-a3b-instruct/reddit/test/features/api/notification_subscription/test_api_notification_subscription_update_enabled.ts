import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationSubscription";
import { prepare_random_community_platform_notification_subscription } from "../../../prepare/prepare_random_community_platform_notification_subscription";
import { generate_random_community_platform_member_notification_subscriptions_create } from "../../../generate/generate_random_community_platform_member_notification_subscriptions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_subscription_update_enabled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // memberConnection.headers is now updated internally by authorize function
  // Step 2: Create a new notification subscription with enabled=false
  const subscription =
    await generate_random_community_platform_member_notification_subscriptions_create(
      memberConnection,
      {
        body: {
          notification_type: "community_updates", // Fixed: Changed from "new_post" to valid enum value "community_updates"
          channel: "email",
          enabled: false,
          created_at: new Date().toISOString(),
          last_status_changed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformNotificationSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 3: Update the subscription's enabled status to true
  const updatedSubscription =
    await api.functional.communityPlatform.member.notification_subscriptions.update(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          enabled: true,
        } satisfies ICommunityPlatformNotificationSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  // Step 4: Verify the subscription was updated correctly
  TestValidator.equals(
    "enabled status updated to true",
    updatedSubscription.enabled,
    true,
  );
  TestValidator.notEquals(
    "last_status_changed_at was updated",
    updatedSubscription.last_status_changed_at,
    subscription.last_status_changed_at,
  );
  TestValidator.equals(
    "notification_type preserved",
    updatedSubscription.notification_type,
    subscription.notification_type,
  );
  TestValidator.equals(
    "channel preserved",
    updatedSubscription.channel,
    subscription.channel,
  );
  TestValidator.equals(
    "subscription ID preserved",
    updatedSubscription.id,
    subscription.id,
  );
}