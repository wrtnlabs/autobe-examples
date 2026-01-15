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
export async function test_api_notification_subscription_update_disabled(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as member using authorize_member_join utility
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Create a new notification subscription with enabled=true using prepare_random utility
  const subscription = prepare_random_community_platform_notification_subscription({
    notification_type: "community_updates",
    channel: "email",
    enabled: true,
  });
  // Use the prepared subscription to create the subscription via API
  const createdSubscription = await generate_random_community_platform_member_notification_subscriptions_create(
    memberConnection,
    {
      body: subscription satisfies ICommunityPlatformNotificationSubscription.ICreate,
    }
  );
  typia.assert(createdSubscription);
  // Step 3: Update the subscription status to disabled using API function
  // Use memberConnection as connection already has auth headers from authorize_member_join
  const updatedSubscription =
    await api.functional.communityPlatform.member.notification_subscriptions.update(
      memberConnection,
      {
        subscriptionId: createdSubscription.id,
        body: {
          enabled: false,
        } satisfies ICommunityPlatformNotificationSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  // Step 4: Validate the subscription was successfully updated
  TestValidator.equals(
    "subscription enabled status should be false",
    updatedSubscription.enabled,
    false,
  );
  TestValidator.notEquals(
    "last_status_changed_at should have been updated",
    updatedSubscription.last_status_changed_at,
    createdSubscription.last_status_changed_at,
  );
  TestValidator.equals(
    "notification_type should remain unchanged",
    updatedSubscription.notification_type,
    createdSubscription.notification_type,
  );
  TestValidator.equals(
    "channel should remain unchanged",
    updatedSubscription.channel,
    createdSubscription.channel,
  );
  TestValidator.equals(
    "frequency should remain unchanged",
    updatedSubscription.frequency,
    createdSubscription.frequency,
  );
  // Confirm that subscription ID hasn't changed
  TestValidator.equals(
    "subscription id should remain unchanged",
    updatedSubscription.id,
    createdSubscription.id,
  );
}