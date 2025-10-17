import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalSubscription";

export async function test_api_subscription_create_by_member(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated member can create a community and subscribe
   * to it.
   *
   * Steps:
   *
   * 1. Register a new member (POST /auth/member/join)
   * 2. Create a community as that member (POST
   *    /communityPortal/member/communities)
   * 3. Subscribe to the community (POST
   *    /communityPortal/member/communities/{communityId}/subscriptions)
   *
   * Validations:
   *
   * - All responses pass typia.assert() for DTO conformance
   * - Subscription.user_id equals the authenticated member.id
   * - Subscription.community_id equals the created community.id
   * - Subscription.created_at is present
   */

  // 1) Register a new member and obtain authorization
  const memberBody = {
    username: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}${RandomGenerator.alphaNumeric(4)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member id present",
    member.id !== null && member.id !== undefined,
  );

  // 2) Create a community with the authenticated member
  const communitySlug = `${(member.username ?? member.id).toString().toLowerCase().replace(/\s+/g, "-")}-${RandomGenerator.alphaNumeric(4)}`;
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.predicate(
    "community id present",
    community.id !== null && community.id !== undefined,
  );

  // 3) Subscribe authenticated member to the created community
  const subscriptionRequestBody = {
    community_id: community.id,
  } satisfies ICommunityPortalSubscription.ICreate;

  const subscription: ICommunityPortalSubscription =
    await api.functional.communityPortal.member.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionRequestBody,
      },
    );

  // Validate subscription response shape and business logic
  typia.assert(subscription);
  TestValidator.equals(
    "subscription user matches",
    subscription.user_id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription.community_id,
    community.id,
  );
  TestValidator.predicate(
    "subscription has created_at",
    subscription.created_at !== null && subscription.created_at !== undefined,
  );
}
