import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful community subscription creation wiring for member users.
 *
 * Business context:
 *
 * - A "memberUser" can register (join), then create communities, and then
 *   subscribe to communities via the communityPlatform memberUser surface.
 * - The original scenario talked about bans/restrictions, but we do not have any
 *   explicit banning or membership-rule APIs in the provided surface, so we
 *   instead validate the positive path: when a subscription is allowed, it is
 *   created correctly and bound to the authenticated member user and target
 *   community.
 *
 * Steps:
 *
 * 1. Register a member user using POST /auth/memberUser/join.
 * 2. Rely on the SDK to attach the access token to the connection.
 * 3. Create a community with POST /communityPlatform/memberUser/communities.
 * 4. Create a subscription with POST /communityPlatform/memberUser/subscriptions
 *    pointing at that community.
 * 5. Validate that IDs and summaries on the subscription align with the
 *    authenticated member user and created community.
 */
export async function test_api_member_subscriptions_create_respects_banned_or_restricted_community_policies(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const joinRequest = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // Provide realistic href and referrer as required URI strings
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorized);

  // 2. Create a community as this authenticated member user
  const visibilityCodeOptions = ["public", "restricted", "private"] as const;
  const communityCreate = {
    identifier: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
    visibilityLevelCode: RandomGenerator.pick(visibilityCodeOptions),
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // Sanity: created community has stable id
  TestValidator.predicate(
    "community id must be non-empty UUID string",
    typeof community.id === "string" && community.id.length > 0,
  );

  // 3. Create a subscription for this member user to this community
  const subscriptionCreate = {
    community_id: community.id,
    status: "pending",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreate },
    );
  typia.assert(subscription);

  // 4. Validate wiring between subscription, member user, and community
  TestValidator.equals(
    "subscription member_user_id should match authenticated member user id",
    subscription.member_user_id,
    authorized.id,
  );

  TestValidator.equals(
    "subscription community_id should match created community id",
    subscription.community_id,
    community.id,
  );

  TestValidator.equals(
    "embedded memberUser summary id matches subscription member_user_id",
    subscription.memberUser.id,
    subscription.member_user_id,
  );

  TestValidator.equals(
    "embedded community summary id matches subscription community_id",
    subscription.community.id,
    subscription.community_id,
  );

  // Status should be non-empty string and either equal to requested or
  // platform-adjusted (we do not assert exact policy behavior here).
  TestValidator.predicate(
    "subscription status should be a non-empty string",
    typeof subscription.status === "string" && subscription.status.length > 0,
  );
}
