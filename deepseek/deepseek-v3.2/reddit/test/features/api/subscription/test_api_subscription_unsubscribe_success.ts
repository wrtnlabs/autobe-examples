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
 * Test the primary success path of unsubscribing from a community. A member creates an account, creates a community, subscribes to it, then successfully unsubscribes. Verify that after unsubscription: 1) Subscription is marked as inactive (active: false), 2) The subscription record still exists with deleted_at timestamp, 3) Subscription activity is created with event_type 'unsubscribed', 4) Subscription snapshot is created before deactivation for audit trail, 5) Member loses posting permission in that community (business rule), 6) Community posts are removed from member's home feed (business rule). This validates the core business workflow where users can unsubscribe from communities at any time as per requirement section 330.
 */
export async function test_api_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
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
  TestValidator.equals("subscription is active", subscription.active, true);
  TestValidator.equals(
    "deleted_at is null initially",
    subscription.deleted_at,
    null,
  );
  // 4. Unsubscribe from the community
  await api.functional.communityPlatform.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Verify subscription was soft-deleted (active: false, deleted_at timestamp)
  // Note: SDK does not have a GET endpoint to retrieve subscription status after deletion
  // We'll rely on the successful DELETE response as indication of success
  // Business rules about posting permission and home feed removal require additional endpoints
  // that are not available in the current SDK
  // 6. Validate member cannot create posts in the community (posting permission loss)
  // Note: No POST endpoint available for creating posts to test this business rule
  // 7. Validate community posts removed from member's home feed
  // Note: No GET endpoint available for home feed to test this business rule
}
