import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_subscription_retrieval_by_owner(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that a subscription can be retrieved by its owner and that
   * ownership-based access control is enforced for other users and
   * unauthenticated requests.
   *
   * Steps:
   *
   * 1. Create two isolated connection contexts and register owner and otherMember
   * 2. Owner creates a community
   * 3. Owner subscribes to the community and obtains subscriptionId
   * 4. Owner retrieves the subscription and validates audit fields
   * 5. OtherMember attempts to retrieve the same subscription -> should throw
   * 6. Unauthenticated request attempts to retrieve the subscription -> should
   *    throw
   */

  // 1) Prepare isolated connections for two members and an unauthenticated client
  const ownerConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 1) Register owner
  const ownerInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
  } satisfies ICommunityPortalMember.ICreate;

  const owner: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(ownerConn, {
      body: ownerInput,
    });
  typia.assert(owner);

  // 1) Register other member
  const otherInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
  } satisfies ICommunityPortalMember.ICreate;

  const otherMember: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(otherConn, {
      body: otherInput,
    });
  typia.assert(otherMember);

  // 2) Owner creates a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(ownerConn, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Owner subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      ownerConn,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  const subscriptionId: string = subscription.id;

  // 4) Owner retrieves the subscription and validates fields
  const retrieved: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.subscriptions.at(ownerConn, {
      subscriptionId,
    });
  typia.assert(retrieved);

  // Business-level assertions
  TestValidator.equals("subscription id matches", retrieved.id, subscriptionId);
  TestValidator.equals(
    "subscription user is owner",
    retrieved.user_id,
    owner.id,
  );
  TestValidator.equals(
    "subscription community matches",
    retrieved.community_id,
    community.id,
  );

  // typia.assert already verifies date-time formats; ensure deleted_at is null for active subscription
  TestValidator.equals(
    "deleted_at is null for active subscription",
    retrieved.deleted_at,
    null,
  );

  // 5) Negative: other authenticated member must not access the owner's subscription
  await TestValidator.error(
    "other member cannot access another user's subscription",
    async () => {
      await api.functional.communityPortal.member.subscriptions.at(otherConn, {
        subscriptionId,
      });
    },
  );

  // 6) Negative: unauthenticated request should fail
  await TestValidator.error(
    "unauthenticated client cannot access subscription",
    async () => {
      await api.functional.communityPortal.member.subscriptions.at(unauthConn, {
        subscriptionId,
      });
    },
  );
}
