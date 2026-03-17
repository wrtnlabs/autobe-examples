import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_admin_subscription_status_activate_own_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Create member account (who will own the subscription)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Create subscription initially inactive
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: false,
        },
      },
    );
  typia.assert(subscription);
  // Validate subscription is initially inactive
  TestValidator.equals(
    "subscription should initially be inactive",
    subscription.active,
    false,
  );
  // Update subscription status to active using same member connection
  const updated =
    await api.functional.communityPlatform.admin.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updated);
  // Validate subscription is now active
  TestValidator.equals(
    "subscription should be active after update",
    updated.active,
    true,
  );
  TestValidator.equals("ID should match", updated.id, subscription.id);
  TestValidator.notEquals(
    "updated_at should change",
    updated.updated_at,
    subscription.updated_at,
  );
  TestValidator.equals(
    "created_at should remain same",
    updated.created_at,
    subscription.created_at,
  );
  TestValidator.equals("deleted_at should be null", updated.deleted_at, null);
  // Validate relationships
  TestValidator.equals(
    "member ID should match",
    updated.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community ID should match",
    updated.community.id,
    community.id,
  );
  // Test that duplicate active subscription is prevented
  await TestValidator.error(
    "should not allow duplicate active subscription",
    async () => {
      await api.functional.communityPlatform.admin.subscriptions.status(
        memberConnection,
        {
          subscriptionId: subscription.id,
          body: {
            active: true,
          } satisfies ICommunityPlatformSubscription.IUpdate,
        },
      );
    },
  );
}
