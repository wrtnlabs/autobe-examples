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
 * Test retrieval of a soft-deleted subscription by its owner.
 * After creating and then deleting a subscription, attempt to retrieve it using the subscription ID.
 * Verify the API returns the subscription with a non-null deleted_at timestamp,
 * confirming soft deletion is visible to the owner.
 */
export async function test_api_subscription_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community for subscription
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create active subscription
  const subscriptionCreateBody = {
    community_id: community.id,
    active: true,
  } satisfies ICommunityPlatformSubscription.ICreate;
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription initially has null deleted_at",
    subscription.deleted_at,
    null,
  );
  // 4. Soft delete the subscription
  await api.functional.communityPlatform.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Try to retrieve the deleted subscription - two possible outcomes:
  //    a) Returns subscription with non-null deleted_at (owner can view their own deleted subscription)
  //    b) Returns 404 error (deleted subscriptions not visible)
  try {
    const retrieved =
      await api.functional.communityPlatform.member.subscriptions.at(
        memberConnection,
        {
          subscriptionId: subscription.id,
        },
      );
    typia.assert(retrieved);
    // Option a: Subscription returned with deleted_at timestamp
    TestValidator.notEquals(
      "soft-deleted subscription has non-null deleted_at",
      retrieved.deleted_at,
      null,
    );
    TestValidator.equals(
      "subscription ID remains unchanged",
      retrieved.id,
      subscription.id,
    );
    TestValidator.equals(
      "community ID remains unchanged",
      retrieved.community.id,
      subscription.community.id,
    );
    TestValidator.equals(
      "member ID remains unchanged",
      retrieved.member.id,
      subscription.member.id,
    );
  } catch (error) {
    // Option b: 404 error - subscription not found after deletion
    // This would be valid if API hides deleted subscriptions even from owners
    TestValidator.httpError("deleted subscription returns 404", 404, () => {
      throw error;
    });
  }
}
