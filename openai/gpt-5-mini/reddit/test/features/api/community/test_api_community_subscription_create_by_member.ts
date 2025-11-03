import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";

/**
 * Validate community subscription creation by an authenticated member, and
 * assert failure cases for unauthenticated and unauthorized attempts.
 *
 * Steps:
 *
 * 1. Create a public community owner and create a public community.
 * 2. Create a private community owner and create a private community (visibility =
 *    'private').
 * 3. Create a subscriber member and authenticate.
 * 4. Subscriber subscribes to the public community (notification_level: 'all') ->
 *    expect success and is_active === true.
 * 5. Unauthenticated attempt to subscribe to the public community -> expect error.
 * 6. Subscriber (non-member) attempts to subscribe to the private community ->
 *    expect error.
 */
export async function test_api_community_subscription_create_by_member(
  connection: api.IConnection,
) {
  // 1) Create public community owner and community
  const ownerPublicConn: api.IConnection = { ...connection, headers: {} };
  const ownerPublicBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `ownerpub_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerPublic: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerPublicConn, {
      body: ownerPublicBody,
    });
  typia.assert(ownerPublic);

  const publicCommunityBody = {
    name: RandomGenerator.name(),
    slug: `test-community-public-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph(),
    visibility: "public",
    settings: {
      require_post_approval: false,
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const publicCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerPublicConn,
      { body: publicCommunityBody },
    );
  typia.assert(publicCommunity);

  // 2) Create private community owner and community
  const ownerPrivateConn: api.IConnection = { ...connection, headers: {} };
  const ownerPrivateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `ownerpriv_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const ownerPrivate: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(ownerPrivateConn, {
      body: ownerPrivateBody,
    });
  typia.assert(ownerPrivate);

  const privateCommunityBody = {
    name: RandomGenerator.name(),
    slug: `test-community-private-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`,
    description: RandomGenerator.paragraph(),
    visibility: "private",
    settings: {
      require_post_approval: false,
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const privateCommunity: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      ownerPrivateConn,
      { body: privateCommunityBody },
    );
  typia.assert(privateCommunity);

  // 3) Create subscriber member and authenticate
  const subscriberConn: api.IConnection = { ...connection, headers: {} };
  const subscriberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `subscriber_${RandomGenerator.alphaNumeric(6)}`,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const subscriberAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(subscriberConn, {
      body: subscriberBody,
    });
  typia.assert(subscriberAuth);

  // 4) Happy path: subscriber subscribes to public community
  const subscriptionBody = {
    notification_level: "all",
  } satisfies ICommunityBbsCommunitySubscription.ICreate;

  const subscription: ICommunityBbsCommunitySubscription =
    await api.functional.communityBbs.communityMember.communities.subscriptions.create(
      subscriberConn,
      { communitySlug: publicCommunity.slug, body: subscriptionBody },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription should be active",
    subscription.is_active,
    true,
  );

  // 5) Unauthenticated attempt should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot subscribe", async () => {
    await api.functional.communityBbs.communityMember.communities.subscriptions.create(
      unauthConn,
      { communitySlug: publicCommunity.slug, body: subscriptionBody },
    );
  });

  // 6) Subscriber (non-member) attempts to subscribe to private community -> expected error
  await TestValidator.error(
    "non-member cannot subscribe to private community",
    async () => {
      await api.functional.communityBbs.communityMember.communities.subscriptions.create(
        subscriberConn,
        { communitySlug: privateCommunity.slug, body: subscriptionBody },
      );
    },
  );
}
