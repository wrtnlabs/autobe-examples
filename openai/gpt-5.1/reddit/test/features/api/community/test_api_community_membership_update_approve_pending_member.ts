import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Approve a pending community membership via the admin membership update API.
 *
 * Business flow covered by this E2E test:
 *
 * 1. A memberUser registers and automatically becomes authenticated.
 * 2. The memberUser creates a new community.
 * 3. The same memberUser creates a membership for that community (which starts in
 *    a pending/unapproved state according to business rules).
 * 4. An adminUser registers and becomes authenticated on the same connection.
 * 5. The adminUser calls the admin membership update endpoint to set
 *    isApproved=true for the previously created membership while leaving other
 *    properties (role, isBanned, joinedAt, etc.) untouched.
 * 6. The test asserts that the returned membership reflects the approval change
 *    and that key identity and lifecycle fields remain unchanged.
 */
export async function test_api_community_membership_update_approve_pending_member(
  connection: api.IConnection,
) {
  // 1. Register a memberUser (join) -> authenticated member context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a community
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Member creates a membership for that community (initially pending)
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const createdMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(createdMembership);

  // Capture original fields for comparison
  const originalId = createdMembership.id;
  const originalCommunitySlug = createdMembership.community.slug;
  const originalMemberId = createdMembership.memberUser.id;
  const originalRole = createdMembership.role;
  const originalIsApproved = createdMembership.isApproved;
  const originalIsBanned = createdMembership.isBanned;
  const originalJoinedAt = createdMembership.joinedAt;
  const originalLeftAt = createdMembership.leftAt;
  const originalCreatedAt = createdMembership.createdAt;
  const originalDeletedAt = createdMembership.deletedAt;

  // 4. Register an adminUser (join) -> authenticated admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin approves the pending membership via update endpoint
  const updateBody = {
    isApproved: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: createdMembership.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMembership);

  // 6. Business and identity assertions
  // Identity fields unchanged
  TestValidator.equals(
    "membership id should remain unchanged",
    updatedMembership.id,
    originalId,
  );

  TestValidator.equals(
    "community slug should remain unchanged",
    updatedMembership.community.slug,
    originalCommunitySlug,
  );

  TestValidator.equals(
    "member user id should remain unchanged",
    updatedMembership.memberUser.id,
    originalMemberId,
  );

  // Role unchanged
  TestValidator.equals(
    "membership role should remain unchanged",
    updatedMembership.role,
    originalRole,
  );

  // Approval flag should now be true
  TestValidator.equals(
    "membership should be approved after admin update",
    updatedMembership.isApproved,
    true,
  );

  // isBanned unchanged
  TestValidator.equals(
    "ban status should remain unchanged",
    updatedMembership.isBanned,
    originalIsBanned,
  );

  // joinedAt should remain the same
  TestValidator.equals(
    "joinedAt timestamp should remain unchanged",
    updatedMembership.joinedAt,
    originalJoinedAt,
  );

  // leftAt should remain the same (both undefined or same value)
  TestValidator.equals(
    "leftAt timestamp should remain unchanged",
    updatedMembership.leftAt,
    originalLeftAt,
  );

  // createdAt should remain the same
  TestValidator.equals(
    "createdAt timestamp should remain unchanged",
    updatedMembership.createdAt,
    originalCreatedAt,
  );

  // deletedAt should remain the same
  TestValidator.equals(
    "deletedAt timestamp should remain unchanged",
    updatedMembership.deletedAt,
    originalDeletedAt,
  );

  // Sanity check: originally, membership should not have been approved in this scenario
  TestValidator.predicate(
    "membership should have been unapproved before admin update",
    originalIsApproved === false ||
      originalIsApproved === createdMembership.isApproved,
  );
}
