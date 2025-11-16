import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate creation of a community subscription in an inactive state.
 *
 * Business goal: Ensure that a freshly registered member user can create a
 * subscription for a community with `is_active = false` and
 * `receive_notifications = false`, and that the backend preserves these flags
 * exactly as provided without normalizing them to active/true. Also verify that
 * the created subscription is correctly bound to the authenticated member user
 * and to the target community.
 *
 * High-level workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join.
 *
 *    - Build a realistic ICommunityPlatformMemberuser.IJoin payload: username (3-32
 *         chars), email as a valid email, password >= 8 chars, href/referrer as
 *         valid URIs, and omit ip (let server derive it).
 *    - Receive ICommunityPlatformMemberuser.IAuthorized and rely on the SDK to
 *         attach the access token to the shared connection.
 * 2. Create a new community via POST /communityPlatform/memberUser/communities.
 *
 *    - Build an ICommunityPlatformCommunity.ICreate body with:
 *
 *         - Slug: non-empty, <=128 chars, URL-safe-ish string (use random alphabets).
 *         - Name: non-empty, <=255 chars (use RandomGenerator.name and trim if needed).
 *         - Description: either null or a random paragraph within 4000 chars.
 *         - Visibility/status: simple string literals like "public" and "active".
 *         - Boolean flags for nsfw/quarantined/posting restrictions and allowed content
 *                   types set to reasonable random or fixed values.
 *    - Assert the resulting ICommunityPlatformCommunity and hold on to its id.
 * 3. Create an inactive subscription via POST
 *    /communityPlatform/memberUser/subscriptions.
 *
 *    - Use ICommunityPlatformCommunitySubscription.ICreate as body with:
 *
 *         - Community_platform_community_id: community.id
 *         - Is_active: false
 *         - Receive_notifications: false
 *    - Assert the resulting ICommunityPlatformCommunitySubscription and keep it.
 * 4. Validate returned subscription state using TestValidator and typia.assert.
 *
 *    - Typia.assert on member join, community, and subscription responses.
 *    - TestValidator.equals to verify:
 *
 *         - Subscription.is_active is false
 *         - Subscription.receive_notifications is false
 *         - Subscription.community.id equals community.id
 *         - Subscription.memberUser.id equals authorizedMember.id
 *
 * Notes and constraints:
 *
 * - Use ONLY provided SDK functions:
 *
 *   - Api.functional.auth.memberUser.join
 *   - Api.functional.communityPlatform.memberUser.communities.create
 *   - Api.functional.communityPlatform.memberUser.subscriptions.create
 * - Use the exact DTO variants for request bodies: IJoin, ICreate (community),
 *   and ICreate (subscription).
 * - Use `satisfies` for all request bodies; do not use `as` casts or `any`.
 * - Do not use or modify connection.headers directly; rely on SDK auth behavior.
 * - Do not attempt to call any non-provided read or list endpoints; rely solely
 *   on the create responses for validation.
 * - No tests for type errors or invalid payloads; focus solely on valid business
 *   flow and state preservation for inactive subscriptions.
 */
export async function test_api_community_subscription_creation_with_inactive_state(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedMember);

  // 2. Create a new community as the authenticated member user
  const communityBody = {
    slug: RandomGenerator.alphabets(16),
    name: RandomGenerator.name(2).slice(0, 255),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create an inactive subscription for that community
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: false,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4. Validate subscription state and linkages
  TestValidator.equals(
    "subscription should be inactive",
    subscription.is_active,
    false,
  );

  TestValidator.equals(
    "subscription notifications should be disabled",
    subscription.receive_notifications,
    false,
  );

  TestValidator.equals(
    "subscription's community id should match created community",
    subscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "subscription's memberUser id should match authorized member",
    subscription.memberUser.id,
    authorizedMember.id,
  );
}
