import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an authenticated member user can create a community and then
 * successfully create a membership in that community, and that the resulting
 * membership entity is consistent with both the community and member user.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a new member user through POST
 *    /auth/memberUser/join.
 * 2. Using the authenticated context, create a new community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Create a membership for that community using POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships.
 * 4. Verify that the membership response embeds the correct community summary,
 *    correct member user summary, the requested role, expected approval/ban
 *    defaults, and sensible lifecycle timestamps.
 */
export async function test_api_community_membership_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a new community as this member user
  const communityCreateBody = {
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

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership for that community
  const requestedRole = "member";
  const membershipCreateBody = {
    role: requestedRole,
    // Rely on server defaults for isApproved/isBanned in a normal member join.
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(membership);

  // 4. Validate membership consistency

  // 4.1 Community summary matches created community
  TestValidator.equals(
    "membership community id matches created community id",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership community slug matches created community slug",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership community name matches created community name",
    membership.community.name,
    community.name,
  );

  // 4.2 Member user summary matches authenticated member user
  TestValidator.equals(
    "membership memberUser id matches authorized member id",
    membership.memberUser.id,
    authorized.id,
  );
  TestValidator.equals(
    "membership memberUser username matches authorized username",
    membership.memberUser.username,
    authorized.username,
  );

  // 4.3 Role matches request
  TestValidator.equals(
    "membership role matches requested role",
    membership.role,
    requestedRole,
  );

  // 4.4 Approval/ban state behaves like open, active membership
  TestValidator.predicate(
    "membership isApproved is true for new member join (open community default)",
    membership.isApproved === true,
  );
  TestValidator.predicate(
    "membership isBanned is false for new member join",
    membership.isBanned === false,
  );

  // 4.5 Timestamp sanity checks
  // typia.assert already guarantees format "date-time" for joinedAt/createdAt/updatedAt.
  const joinedAt = new Date(membership.joinedAt).getTime();
  const createdAt = new Date(membership.createdAt).getTime();
  const updatedAt = new Date(membership.updatedAt).getTime();

  TestValidator.predicate("joinedAt is not NaN", Number.isFinite(joinedAt));
  TestValidator.predicate("createdAt is not NaN", Number.isFinite(createdAt));
  TestValidator.predicate("updatedAt is not NaN", Number.isFinite(updatedAt));

  TestValidator.predicate(
    "joinedAt is less than or equal to createdAt",
    joinedAt <= createdAt,
  );
  TestValidator.predicate(
    "createdAt is less than or equal to updatedAt",
    createdAt <= updatedAt,
  );

  // leftAt should be undefined at creation time (no leave event yet)
  TestValidator.predicate(
    "leftAt is undefined on freshly created membership",
    membership.leftAt === undefined,
  );

  // deletedAt should also be undefined on a fresh membership
  TestValidator.predicate(
    "deletedAt is undefined on freshly created membership",
    membership.deletedAt === undefined,
  );
}
