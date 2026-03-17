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

export async function test_api_subscription_status_deactivation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account with utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create community with utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create active subscription with utility function
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  const initialUpdatedAt = subscription.updated_at;
  // Step 4: Deactivate subscription
  const updatedSubscription =
    await api.functional.communityPlatform.member.subscriptions.status(
      memberConnection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(updatedSubscription);
  // Step 5: Validate status changed from active to inactive
  TestValidator.equals(
    "subscription should be inactive after update",
    updatedSubscription.active,
    false,
  );
  // Step 6: Verify updated_at timestamp is updated
  TestValidator.notEquals(
    "updated_at timestamp should change after deactivation",
    updatedSubscription.updated_at,
    initialUpdatedAt,
  );
  // Step 7: Validate complete subscription structure
  TestValidator.equals(
    "subscription id should remain unchanged",
    updatedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member id should remain unchanged",
    updatedSubscription.member.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "community id should remain unchanged",
    updatedSubscription.community.id,
    subscription.community.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSubscription.created_at,
    subscription.created_at,
  );
  TestValidator.equals(
    "deleted_at should remain null",
    updatedSubscription.deleted_at,
    null,
  );
}
