import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionSnapshot";
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
 * Test authorization boundary for subscription snapshots - ensure members cannot access
 * other users' snapshots. Create two separate member accounts. First member creates
 * community and subscription, generates snapshots. Second member attempts to access
 * subscription snapshots endpoint with filtering that might target first member's data
 * (e.g., by community_id). Verify that the second member only receives an empty list
 * or their own snapshots, never the first member's data. This tests the security
 * boundary that regular users can only view their own subscription snapshots as enforced
 * by implicit user_id filtering from authenticated session. Also verify that pagination
 * metadata correctly reflects the accessible dataset size for each user.
 */
export async function test_api_subscription_snapshots_user_isolation(
  connection: api.IConnection,
) {
  // 1. Create first member account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // 2. Create second member account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // 3. First member creates community using utility function
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. First member subscribes to the community using utility function
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 5. Generate subscription snapshots by updating subscription status
  const update1 =
    await api.functional.communityPlatform.member.subscriptions.status(
      member1Connection,
      {
        subscriptionId: subscription.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(update1);
  const update2 =
    await api.functional.communityPlatform.member.subscriptions.status(
      member1Connection,
      {
        subscriptionId: subscription.id,
        body: { active: true } satisfies ICommunityPlatformSubscription.IUpdate,
      },
    );
  typia.assert(update2);
  // 6. Second member queries subscription snapshots with first member's community filter
  const member2Query =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      member2Connection,
      {
        body: {
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(member2Query);
  // 7. Validate second member cannot see first member's snapshots
  TestValidator.equals(
    "second member sees no snapshots for other's community",
    member2Query.data.length,
    0,
  );
  TestValidator.equals(
    "second member pagination shows zero records",
    member2Query.pagination.records,
    0,
  );
  TestValidator.equals(
    "second member pagination shows zero pages",
    member2Query.pagination.pages,
    0,
  );
  // 8. First member queries their own subscription snapshots
  const member1Query =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      member1Connection,
      {
        body: {
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(member1Query);
  // 9. Validate first member can see their own snapshots
  TestValidator.predicate(
    "first member sees at least one snapshot",
    member1Query.data.length > 0,
  );
  TestValidator.equals(
    "first member pagination records match snapshot count",
    member1Query.pagination.records,
    member1Query.data.length,
  );
  TestValidator.predicate(
    "first member has at least one page",
    member1Query.pagination.pages >= 1,
  );
  // 10. Validate snapshot data isolation - all snapshots belong to first member
  for (const snapshot of member1Query.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} belongs to member1`,
      snapshot.user.id,
      member1Auth.id,
    );
    TestValidator.equals(
      `snapshot ${snapshot.id} references correct community`,
      snapshot.community.id,
      community.id,
    );
  }
  // 11. Additional test: second member queries without filters (should see empty or own data)
  const member2Unfiltered =
    await api.functional.communityPlatform.member.subscription_snapshots.index(
      member2Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionSnapshot.IRequest,
      },
    );
  typia.assert(member2Unfiltered);
  // Second member has no subscriptions, so should see empty
  TestValidator.equals(
    "unfiltered query returns empty for member with no subscriptions",
    member2Unfiltered.data.length,
    0,
  );
}
