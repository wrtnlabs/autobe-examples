import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that a community membership detail read reflects the persisted
 * membership state created by the member user flow.
 *
 * Business context
 *
 * - A member user can register (join) as a platform memberUser.
 * - An authenticated member user can create a community.
 * - For a given community, an authenticated member user can create a membership
 *   record via the memberUser-facing membership creation endpoint.
 * - The membership detail endpoint should return a
 *   ICommunityPlatformCommunityMembership that is consistent with the
 *   membership creation result, including the role, approval/ban flags,
 *   timestamps, and embedded community/memberUser summaries.
 *
 * Scenario (adapted to available APIs)
 *
 * 1. Call POST /auth/memberUser/join to create and authenticate a new memberUser;
 *    rely on the SDK to set Authorization headers.
 * 2. With this authenticated connection, call POST
 *    /communityPlatform/memberUser/communities to create a new community using
 *    ICommunityPlatformCommunity.ICreate; capture its slug.
 * 3. Using the same authenticated connection, call POST
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships with
 *    ICommunityPlatformCommunityMembership.ICreate, choosing a specific role
 *    and explicitly specifying isApproved / isBanned values so all flags are
 *    deterministic.
 * 4. Immediately call GET
 *    /communityPlatform/memberUser/communities/{communitySlug}/memberships/{membershipId}
 *    using
 *    api.functional.communityPlatform.memberUser.communities.memberships.at
 *    with the slug and the membership id from step 3.
 *
 * Validations
 *
 * - All responses are asserted with typia.assert to fully validate their DTO
 *   shapes.
 * - The membership object returned from the create call and the object returned
 *   from the detail (at) call must have the same id.
 * - Role must match between create response and detail response.
 * - IsApproved and isBanned in the detail response must equal the values from the
 *   create response (which themselves reflect what was persisted).
 * - JoinedAt, createdAt, updatedAt must be identical between the two responses,
 *   since we have not performed any status-changing updates.
 * - The embedded community summary in the membership detail must have the same id
 *   and slug as the community created in step 2.
 * - The embedded memberUser summary in the membership detail must have the same
 *   id and username as the authenticated member user from step 1.
 */
export async function test_api_community_membership_detail_after_status_change(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Leave ip as null so the server can derive from transport if desired.
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a new community as this member user.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
      { body: communityBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a membership for this community.
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(createdMembership);

  // 4. Fetch the membership detail using the detail endpoint.
  const reloadedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.at(
      connection,
      {
        communitySlug: community.slug,
        membershipId: createdMembership.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(reloadedMembership);

  // 5. Validate consistency between created and reloaded membership.
  TestValidator.equals(
    "membership id should be stable between create and detail",
    reloadedMembership.id,
    createdMembership.id,
  );

  TestValidator.equals(
    "membership role should match between create and detail",
    reloadedMembership.role,
    createdMembership.role,
  );

  TestValidator.equals(
    "isApproved flag should match between create and detail",
    reloadedMembership.isApproved,
    createdMembership.isApproved,
  );

  TestValidator.equals(
    "isBanned flag should match between create and detail",
    reloadedMembership.isBanned,
    createdMembership.isBanned,
  );

  TestValidator.equals(
    "joinedAt should be identical between create and detail",
    reloadedMembership.joinedAt,
    createdMembership.joinedAt,
  );

  TestValidator.equals(
    "createdAt should be identical between create and detail",
    reloadedMembership.createdAt,
    createdMembership.createdAt,
  );

  TestValidator.equals(
    "updatedAt should be identical between create and detail",
    reloadedMembership.updatedAt,
    createdMembership.updatedAt,
  );

  // Community summary consistency.
  TestValidator.equals(
    "community summary id in membership should match created community id",
    reloadedMembership.community.id,
    community.id,
  );

  TestValidator.equals(
    "community summary slug in membership should match created community slug",
    reloadedMembership.community.slug,
    community.slug,
  );

  // Member user summary consistency.
  TestValidator.equals(
    "memberUser summary id in membership should match authorized member id",
    reloadedMembership.memberUser.id,
    authorized.id,
  );

  TestValidator.equals(
    "memberUser summary username in membership should match authorized username",
    reloadedMembership.memberUser.username,
    authorized.username,
  );
}
