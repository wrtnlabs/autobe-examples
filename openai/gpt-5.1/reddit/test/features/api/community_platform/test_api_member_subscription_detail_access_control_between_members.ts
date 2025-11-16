import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate access control of member-scoped community subscription detail
 * endpoint between different member users.
 *
 * Business purpose:
 *
 * - Ensure that a member user (Member B) cannot access the detailed subscription
 *   record of another member user (Member A) via GET
 *   /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}.
 * - Confirm that same-member access (Member A to their own subscription, Member B
 *   to their own subscription) works, so failures are attributable to
 *   authorization, not generic endpoint issues.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate Member A using POST /auth/memberUser/join,
 *    capturing Member A's id.
 * 2. While authenticated as Member A, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Still as Member A, create a subscription for that community for Member A via
 *    POST /communityPlatform/memberUser/members/{memberUserId}/subscriptions,
 *    capturing subscriptionA.id.
 * 4. Optionally verify that Member A can retrieve their own subscription detail
 *    successfully using GET
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}.
 * 5. Register and authenticate Member B via POST /auth/memberUser/join (this
 *    changes the active Authorization header in the shared connection).
 * 6. While authenticated as Member B, attempt to retrieve Member A's subscription
 *    detail using the same GET endpoint but with:
 *
 *    - MemberUserId = Member A's id
 *    - SubscriptionId = subscriptionA.id and assert that this call results in an
 *         error (authorization / access control).
 * 7. As a control, still as Member B, create a second community and a subscription
 *    for Member B, then successfully retrieve that subscription's detail to
 *    confirm the endpoint works for the owning member.
 *
 * Validation details:
 *
 * - Use typia.assert on all successful responses to enforce DTO type correctness.
 * - Use TestValidator.error with an async closure for the unauthorized
 *   cross-account access attempt; do not assert specific HTTP status codes.
 * - Use TestValidator.equals to prove that:
 *
 *   - Member A and Member B have different ids.
 *   - For self-access (Member A or B), the subscription detail's id matches the
 *       created subscription id.
 *   - The subscription's memberUser.id equals the expected owner member id.
 *   - The subscription's community.id equals the community id used when creating
 *       the subscription.
 */
export async function test_api_member_subscription_detail_access_control_between_members(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Member A
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A creates a community
  const communityABody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityABody,
      },
    );
  typia.assert(communityA);

  // 3. Member A creates a subscription to communityA
  const subscriptionABody = {
    community_platform_community_id: communityA.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionA: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberA.id,
        body: subscriptionABody,
      },
    );
  typia.assert(subscriptionA);

  // Optional: verify Member A can retrieve their own subscription detail
  const subscriptionADetail: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.at(
      connection,
      {
        memberUserId: memberA.id,
        subscriptionId: subscriptionA.id,
      },
    );
  typia.assert(subscriptionADetail);

  TestValidator.equals(
    "Member A self-access: subscription id matches",
    subscriptionADetail.id,
    subscriptionA.id,
  );
  TestValidator.equals(
    "Member A self-access: memberUser id matches",
    subscriptionADetail.memberUser.id,
    memberA.id,
  );
  TestValidator.equals(
    "Member A self-access: community id matches",
    subscriptionADetail.community.id,
    communityA.id,
  );

  // 4. Register and authenticate Member B (overwrites connection auth token)
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  TestValidator.predicate(
    "Member A and Member B must have different ids",
    memberA.id !== memberB.id,
  );

  // 5. As Member B, attempt to retrieve Member A's subscription detail and expect an error
  await TestValidator.error(
    "Member B cannot access Member A's subscription detail",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.at(
        connection,
        {
          memberUserId: memberA.id,
          subscriptionId: subscriptionA.id,
        },
      );
    },
  );

  // 6. Control: Member B creates their own community and subscription, then retrieves it
  const communityBBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBBody,
      },
    );
  typia.assert(communityB);

  const subscriptionBBody = {
    community_platform_community_id: communityB.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscriptionB: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberB.id,
        body: subscriptionBBody,
      },
    );
  typia.assert(subscriptionB);

  const subscriptionBDetail: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.at(
      connection,
      {
        memberUserId: memberB.id,
        subscriptionId: subscriptionB.id,
      },
    );
  typia.assert(subscriptionBDetail);

  TestValidator.equals(
    "Member B self-access: subscription id matches",
    subscriptionBDetail.id,
    subscriptionB.id,
  );
  TestValidator.equals(
    "Member B self-access: memberUser id matches",
    subscriptionBDetail.memberUser.id,
    memberB.id,
  );
  TestValidator.equals(
    "Member B self-access: community id matches",
    subscriptionBDetail.community.id,
    communityB.id,
  );
}
