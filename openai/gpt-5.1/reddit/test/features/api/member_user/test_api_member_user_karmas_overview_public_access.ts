import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberUserKarmasOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUserKarmasOverview";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserCommentKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserCommentKarmas";
import type { ICommunityPlatformUserPostKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPostKarmas";
import type { ICommunityPlatformUserTotalKarmas } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserTotalKarmas";

/**
 * Validate public access to member user karma overview.
 *
 * Business goal:
 *
 * - Ensure that a member user's combined karma overview (total, post, comment)
 *   can be fetched using GET
 *   /communityPlatform/memberUsers/{memberUserId}/karmas without any
 *   Authorization header, suitable for public profile dashboards.
 * - Verify structural correctness, identity consistency, and basic numeric
 *   relationships between aggregate fields, even when underlying karma values
 *   may be zero (no activity in this harness).
 *
 * Test flow:
 *
 * 1. Register a platform admin (POST /auth/platformAdmin/join) to obtain
 *    platform-level privileges.
 * 2. As that admin, create a visibility level master record via POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user (POST /auth/memberUser/join) who will own the karma
 *    overview.
 * 4. As that member user, create a community using POST
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level by its code.
 * 5. As that member user, subscribe to the community via POST
 *    /communityPlatform/memberUser/subscriptions so the user is in a normal
 *    participation flow.
 * 6. Construct an unauthenticated connection (same host/options, empty headers) so
 *    that subsequent calls lack any Authorization header.
 * 7. Call GET /communityPlatform/memberUsers/{memberUserId}/karmas against the
 *    member user's id using the unauthenticated connection.
 * 8. Assert the response type (ICommunityPlatformMemberUserKarmasOverview) with
 *    typia.assert, then perform business-logic validations:
 *
 *    - Total, post, and comment objects are present.
 *    - Total.member_user_id, post.member_user_id, and comment.member_user_id all
 *         equal the requested member user's id.
 *    - All karma counters are non-negative integers.
 *    - Total.total_karma is greater than or equal to total.post_karma +
 *         total.comment_karma, or at least greater than or equal to each of
 *         post_karma and comment_karma individually.
 */
export async function test_api_member_user_karmas_overview_public_access(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level master record as platform admin.
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility (Test)",
    description:
      "Publicly discoverable community visibility level created for karma overview test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match creation payload",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins and becomes authenticated as memberUser.
  const memberUsername = RandomGenerator.name(1);
  const memberEmail = `${RandomGenerator.alphabets(10)}@member.example.com`;
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: "MemberPassw0rd!",
    ip: "127.0.0.1",
    href: "https://community.app.local/join",
    referrer: "https://community.app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // Sanity check: member's email and username echo back correctly.
  TestValidator.equals(
    "member username should match join payload",
    memberAuthorized.username,
    memberUsername,
  );
  TestValidator.equals(
    "member email should match join payload",
    memberAuthorized.email,
    memberEmail,
  );

  // 4. As member user, create a community referencing the visibility level.
  const communityIdentifier = `test-community-${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Karma Overview Community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should match create payload",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. As member user, subscribe to the created community.
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community_id should match target community",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member_user_id should match member user id",
    subscription.member_user_id,
    memberUserId,
  );

  // 6. Create an unauthenticated connection to ensure public access.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Fetch karma overview without Authorization header.
  const overview: ICommunityPlatformMemberUserKarmasOverview =
    await api.functional.communityPlatform.memberUsers.karmas.at(
      publicConnection,
      { memberUserId },
    );
  typia.assert(overview);

  const total: ICommunityPlatformUserTotalKarmas = overview.total;
  const post: ICommunityPlatformUserPostKarmas = overview.post;
  const comment: ICommunityPlatformUserCommentKarmas = overview.comment;

  // 8. Identity consistency checks.
  TestValidator.equals(
    "total.member_user_id should equal requested member user id",
    total.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "post.member_user_id should equal requested member user id",
    post.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "comment.member_user_id should equal requested member user id",
    comment.member_user_id,
    memberUserId,
  );

  // 9. Non-negative karmas (numeric ranges guaranteed by tags, but we assert business semantics).
  TestValidator.predicate(
    "total.total_karma should be non-negative",
    total.total_karma >= 0,
  );
  TestValidator.predicate(
    "total.post_karma should be non-negative",
    total.post_karma >= 0,
  );
  TestValidator.predicate(
    "total.comment_karma should be non-negative",
    total.comment_karma >= 0,
  );
  TestValidator.predicate(
    "post.post_karma should be non-negative",
    post.post_karma >= 0,
  );
  TestValidator.predicate(
    "comment.comment_karma should be non-negative",
    comment.comment_karma >= 0,
  );

  // 10. Relationship checks between aggregates.
  TestValidator.predicate(
    "total.total_karma should be >= total.post_karma",
    total.total_karma >= total.post_karma,
  );
  TestValidator.predicate(
    "total.total_karma should be >= total.comment_karma",
    total.total_karma >= total.comment_karma,
  );

  // total_karma should be at least as large as sum of post_karma and comment_karma
  // from its own fields; due to implementation details it might be equal or larger.
  TestValidator.predicate(
    "total.total_karma should be >= total.post_karma + total.comment_karma",
    total.total_karma >= total.post_karma + total.comment_karma,
  );

  // Cross-check that dedicated aggregates do not exceed total's component fields.
  TestValidator.predicate(
    "total.post_karma should be >= post.post_karma",
    total.post_karma >= post.post_karma,
  );
  TestValidator.predicate(
    "total.comment_karma should be >= comment.comment_karma",
    total.comment_karma >= comment.comment_karma,
  );
}
