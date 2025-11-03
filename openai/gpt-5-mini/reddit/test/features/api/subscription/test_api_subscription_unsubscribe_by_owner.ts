import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";

export async function test_api_subscription_unsubscribe_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a new member (owner = alice)
  const aliceEmail = `alice.${Date.now()}@example.test`;
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const aliceAuth = await api.functional.auth.communityMember.join(connection, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://example.test/",
        referrer: "http://example.test/ref",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);

  // typia.assert ensures aliceAuth.member is present
  typia.assert(aliceAuth.member);

  // 2) Create a new community as alice
  const slug = `test-community-${Date.now()}`;
  const createCommunityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches request",
    community.slug,
    slug,
  );

  // 3) Create a subscription for alice to that community
  const createSubscriptionBody = {
    community_id: community.id,
    delivery_channel: "in_app",
    delivery_frequency: "immediate",
  } satisfies ICommunityBbsUserSubscription.ICreate;

  const subscription: ICommunityBbsUserSubscription =
    await api.functional.communityBbs.communityMember.communityMembers.subscriptions.create(
      connection,
      {
        username: aliceAuth.member.username,
        body: createSubscriptionBody,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription points to created community",
    subscription.community.id,
    community.id,
  );

  // 4) Owner (alice) calls DELETE to soft-delete the subscription
  await api.functional.communityBbs.communityMember.communityMembers.subscriptions.erase(
    connection,
    {
      username: aliceAuth.member.username,
      subscriptionId: subscription.id,
    },
  );

  // After erase, attempt idempotent delete again (should succeed silently)
  await api.functional.communityBbs.communityMember.communityMembers.subscriptions.erase(
    connection,
    {
      username: aliceAuth.member.username,
      subscriptionId: subscription.id,
    },
  );

  // 5) Re-create (reactivate) the subscription and expect the server to
  // reactivate the soft-deleted subscription (returns subscription record).
  const reactivated: ICommunityBbsUserSubscription =
    await api.functional.communityBbs.communityMember.communityMembers.subscriptions.create(
      connection,
      {
        username: aliceAuth.member.username,
        body: createSubscriptionBody,
      },
    );
  typia.assert(reactivated);

  // If server reactivated the existing record, id may match original id.
  TestValidator.equals(
    "reactivated subscription references same community",
    reactivated.community.id,
    community.id,
  );

  // 6) Unauthorized attempt: bob tries to delete alice's subscription -> 403
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const bobEmail = `bob.${Date.now()}@example.test`;
  const bobUsername = `bob_${RandomGenerator.alphaNumeric(6)}`;
  const bobAuth = await api.functional.auth.communityMember.join(bobConn, {
    body: {
      email: bobEmail,
      username: bobUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://example.test/",
        referrer: "http://example.test/ref",
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bobAuth);

  await TestValidator.error(
    "bob cannot delete alice's subscription (forbidden)",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.subscriptions.erase(
        bobConn,
        {
          username: aliceAuth.member.username,
          subscriptionId: reactivated.id,
        },
      );
    },
  );

  // 7) Missing subscription: deleting a non-existent subscription -> 404
  await TestValidator.error(
    "deleting non-existent subscription returns not-found",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.subscriptions.erase(
        connection,
        {
          username: aliceAuth.member.username,
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
