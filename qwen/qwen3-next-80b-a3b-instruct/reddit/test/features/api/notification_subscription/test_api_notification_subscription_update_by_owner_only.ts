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
export async function test_api_notification_subscription_update_by_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member account (subscription owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join", 
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(owner);
  // Step 2: Create second member account (unauthorized updater)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(unauthorizedConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join", 
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(unauthorized);
  // Step 3: Create notification subscription for the owner
  const subscription: ICommunityPlatformNotificationSubscription =
    await generate_random_community_platform_member_notification_subscriptions_create(
      ownerConnection,
      {
        body: {
          notification_type: "community_updates",
          channel: "email",
          enabled: true,
          created_at: new Date().toISOString(),
          last_status_changed_at: new Date().toISOString(),
        } satisfies ICommunityPlatformNotificationSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Step 4: Attempt to update the subscription with unauthorized member's connection
  // This should fail with 403 Forbidden due to ownership validation
  await TestValidator.error(
    "unauthorized member cannot update another member's subscription",
    async () => {
      await api.functional.communityPlatform.member.notification_subscriptions.update(
        unauthorizedConnection,
        {
          subscriptionId: subscription.id,
          body: {
            enabled: false,
          } satisfies ICommunityPlatformNotificationSubscription.IUpdate,
        },
      );
    },
  );
}