import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";

/**
 * Validate creation of a community subscription by the community member
 * (owner).
 *
 * Business context:
 *
 * - A community member can sign up, create a community and subscribe to it.
 * - Subscription creation must record delivery preferences and mark the
 *   subscription as active. When a soft-deleted subscription exists, service
 *   may reactivate it; DB-level reactivation verification is outside this test
 *   due to import constraints.
 *
 * Steps:
 *
 * 1. Register a new community member (alice) using POST /auth/communityMember/join
 * 2. Create a community as alice using POST
 *    /communityBbs/communityMember/communities
 * 3. Create a subscription for alice to that community using POST
 *    /communityBbs/communityMember/communityMembers/{username}/subscriptions
 * 4. Validate response payload and business invariants
 */
export async function test_api_subscription_create_by_owner(
  connection: api.IConnection,
) {
  // 1) Create community member (alice)
  const aliceEmail = `alice.${RandomGenerator.alphaNumeric(6)}@example.test`;
  const aliceUsername = `alice_${RandomGenerator.alphaNumeric(6)}`;
  const aliceJoinBody = {
    email: aliceEmail,
    username: aliceUsername,
    password: "Passw0rd!",
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/ref",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: aliceJoinBody,
    });
  typia.assert(authorized);

  // The SDK sets connection.headers.Authorization with the returned access token
  // 2) Create a community as alice
  const slug = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3) Create subscription as alice to the created community
  const subscriptionBody = {
    community_id: community.id,
    delivery_channel: "in_app",
    delivery_frequency: "immediate",
  } satisfies ICommunityBbsUserSubscription.ICreate;

  const subscription: ICommunityBbsUserSubscription =
    await api.functional.communityBbs.communityMember.communityMembers.subscriptions.create(
      connection,
      {
        username: authorized.member.username,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4) Business validations
  TestValidator.predicate(
    "subscription is active",
    subscription.is_active === true,
  );

  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "delivery channel preserved",
    subscription.delivery_channel,
    "in_app",
  );

  TestValidator.equals(
    "delivery frequency preserved",
    subscription.delivery_frequency,
    "immediate",
  );

  // subscribed_at is server-managed timestamp; typia.assert validated format
  TestValidator.predicate(
    "subscription has subscribed_at",
    subscription.subscribed_at !== null &&
      subscription.subscribed_at !== undefined,
  );
}
