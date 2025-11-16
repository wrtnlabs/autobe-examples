import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a newly joined member user can create an active subscription to
 * a freshly created community with notifications enabled.
 *
 * Business workflow covered by this test:
 *
 * 1. A guest user registers as a memberUser via /auth/memberUser/join.
 *
 *    - This must yield an ICommunityPlatformMemberuser.IAuthorized with a non-null
 *         token bundle and account metadata.
 *    - The SDK will automatically attach the access token to the connection so that
 *         subsequent calls are authenticated as this memberUser.
 * 2. Using the authenticated memberUser context, the test creates a new community
 *    via /communityPlatform/memberUser/communities.
 *
 *    - The request body must satisfy ICommunityPlatformCommunity.ICreate.
 *    - The created community must be public, active, non-NSFW, not quarantined, and
 *         permit posting (at minimum text posts).
 * 3. Using the same authenticated memberUser context, the test creates a new
 *    subscription record via /communityPlatform/memberUser/subscriptions.
 *
 *    - The request body must satisfy ICommunityPlatformCommunitySubscription.ICreate
 *         and reference the community.id via community_platform_community_id.
 *    - Is_active must be true and receive_notifications must be true.
 * 4. The test then validates the subscription response:
 *
 *    - It must be a valid ICommunityPlatformCommunitySubscription.
 *    - Subscription.community.id and slug/name must match the created community’s
 *         corresponding fields.
 *    - Subscription.memberUser.id and username must match the authenticated member
 *         user from the join step.
 *    - Subscription.is_active === true.
 *    - Subscription.receive_notifications === true.
 *    - Subscription.deleted_at is null or undefined (i.e., not a concrete date-time
 *         string).
 *
 * The test relies purely on the create responses (no additional GET endpoints)
 * and must not manipulate connection.headers directly, trusting the SDK’s
 * authorization handling performed by the join call.
 */
export async function test_api_community_subscription_creation_for_new_community(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Allow server to derive IP when omitted, keep href/referrer simple but valid
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new, public, active, non-NSFW community with posting allowed
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
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

  // Sanity checks on created community basic invariants
  TestValidator.equals(
    "community visibility should be public",
    community.visibility,
    communityBody.visibility,
  );
  TestValidator.equals(
    "community status should be active",
    community.status,
    communityBody.status,
  );
  TestValidator.equals(
    "community nsfw flag should be false",
    community.is_nsfw,
    communityBody.is_nsfw,
  );

  // 3. Create a subscription for the created community, active with notifications
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4. Validate linkage between subscription, member user, and community
  // Member linkage
  TestValidator.equals(
    "subscription member id should match authorized member id",
    subscription.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "subscription member username should match authorized username",
    subscription.memberUser.username,
    authorized.username,
  );

  // Community linkage
  TestValidator.equals(
    "subscription community id should match created community id",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription community slug should match created community slug",
    subscription.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "subscription community name should match created community name",
    subscription.community.name,
    community.name,
  );

  // Flags and lifecycle fields
  TestValidator.equals(
    "subscription should be active",
    subscription.is_active,
    true,
  );
  TestValidator.equals(
    "subscription should have notifications enabled",
    subscription.receive_notifications,
    true,
  );

  // deleted_at should be null or undefined for a fresh subscription
  TestValidator.predicate(
    "subscription deleted_at should be null or undefined for new subscription",
    subscription.deleted_at === null || subscription.deleted_at === undefined,
  );
}
