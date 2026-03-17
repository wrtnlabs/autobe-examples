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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test successful activation of an existing subscription from inactive to active status.
 * 1. Create member account and authenticate
 * 2. Create community for subscription
 * 3. Create initial subscription (active by default)
 * 4. Deactivate subscription to setup inactive state
 * 5. Activate subscription via PATCH status endpoint
 * 6. Validate status change, timestamps, and member/community details
 */
export async function test_api_subscription_status_activation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Create initial subscription (active by default)
  const initialSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(initialSubscription);
  TestValidator.equals(
    "initial subscription should be active",
    initialSubscription.active,
    true,
  );
  // Store original updated_at timestamp
  const originalUpdatedAt = initialSubscription.updated_at;
  // First deactivate subscription to setup inactive state
  const deactivatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: initialSubscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(deactivatedSubscription);
  TestValidator.equals(
    "subscription should be deactivated",
    deactivatedSubscription.active,
    false,
  );
  TestValidator.notEquals(
    "updated_at should change after deactivation",
    deactivatedSubscription.updated_at,
    originalUpdatedAt,
  );
  // Now activate subscription using target endpoint
  const activatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: initialSubscription.id,
        body: {
          active: true,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(activatedSubscription);
  // Validate activation results
  TestValidator.equals(
    "subscription should be active after activation",
    activatedSubscription.active,
    true,
  );
  TestValidator.notEquals(
    "updated_at should change after activation",
    activatedSubscription.updated_at,
    deactivatedSubscription.updated_at,
  );
  TestValidator.equals(
    "member ID should remain the same",
    activatedSubscription.member.id,
    member.id,
  );
  TestValidator.equals(
    "community ID should remain the same",
    activatedSubscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription should have member details",
    () => activatedSubscription.member.username.length > 0,
  );
  TestValidator.predicate(
    "subscription should have community details",
    () => activatedSubscription.community.name.length > 0,
  );
}
