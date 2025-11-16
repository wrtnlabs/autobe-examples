import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a member user cannot create a subscription for another members
 * ID by manipulating the path parameter, while confirming self-subscription
 * works.
 *
 * Business goal:
 *
 * - Ensure authorization rules prevent a logged-in member user from creating
 *   community subscriptions on behalf of other member users by tampering with
 *   the `memberUserId` path parameter.
 * - At the same time, prove that the subscription-creation endpoint functions
 *   correctly when the path `memberUserId` matches the authenticated member.
 *
 * High-level steps:
 *
 * 1. Register and authenticate Member A with POST /auth/memberUser/join.
 * 2. Register and authenticate Member B with another POST /auth/memberUser/join.
 * 3. Re-establish Member A as the active authenticated principal (by calling join
 *    again for simplicity) and create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 4. While authenticated as Member A, attempt to create a subscription using POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions where
 *    the path `memberUserId` is deliberately set to Member Bs id, but the
 *    authenticated identity is Member A.
 *
 *    - Expect this to fail with an authorization error (captured generically via
 *         TestValidator.error without asserting on HTTP status codes).
 * 5. Then create a valid subscription for Member A with the same endpoint, this
 *    time using Member As id as the path `memberUserId`.
 *
 *    - Expect this call to succeed and return a valid
 *         ICommunityPlatformCommunitySubscription.
 *
 * Notes and constraints:
 *
 * - We do not have any subscription read/index API in the provided SDK, so we
 *   cannot explicitly verify that no subscription was created for Member B.
 *   Therefore, we focus on the fact that the cross-account call fails and the
 *   self-subscription call succeeds.
 * - All request bodies must be constructed using `satisfies {DTO}` with no type
 *   assertions like `as any`.
 * - All non-void responses must be validated using `typia.assert()`.
 * - For the negative case we must use `await TestValidator.error` with an async
 *   callback that awaits the failing API call.
 */
export async function test_api_member_subscription_creation_disallowed_for_mismatched_member_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Member A
  const memberABody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberABody,
    });
  typia.assert(memberA);

  const memberAId: string & tags.Format<"uuid"> = memberA.id;

  // 2. Register and authenticate Member B
  const memberBBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBBody,
    });
  typia.assert(memberB);

  const memberBId: string & tags.Format<"uuid"> = memberB.id;

  // 3. Re-authenticate as Member A (by joining again) so that subsequent
  //    operations run under Member As identity.
  const memberAReBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberARe: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAReBody,
    });
  typia.assert(memberARe);

  const effectiveMemberAId: string & tags.Format<"uuid"> = memberARe.id;

  // 4. Member A creates a community
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  const communityId: string & tags.Format<"uuid"> = community.id;

  // 5. While authenticated as Member A, attempt to create a subscription
  //    for Member B using the path parameter memberUserId = memberBId.
  //    Expect this to fail due to authorization rules.
  const crossSubscriptionBody = {
    community_platform_community_id: communityId,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  await TestValidator.error(
    "member A cannot create subscription for member B via path manipulation",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.create(
        connection,
        {
          memberUserId: memberBId,
          body: crossSubscriptionBody,
        },
      );
    },
  );

  // 6. Create a valid subscription for the effective Member A using their
  //    own id in the path to confirm endpoint functionality.
  const selfSubscriptionBody = {
    community_platform_community_id: communityId,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const selfSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: effectiveMemberAId,
        body: selfSubscriptionBody,
      },
    );
  typia.assert(selfSubscription);

  // Basic sanity check to ensure the subscription is linked to the expected
  // community and member summary IDs.
  TestValidator.equals(
    "self-subscription community id should match created community",
    selfSubscription.community.id,
    communityId,
  );
  TestValidator.equals(
    "self-subscription member summary id should match effective member A id",
    selfSubscription.memberUser.id,
    effectiveMemberAId,
  );
}
