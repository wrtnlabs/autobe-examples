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
 * Validate that an adminUser can update a community membership's moderation
 * attributes.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Create an adminUser (join) and implicitly obtain an authenticated admin
 *    session.
 * 2. Create a memberUser (join) and authenticate as that member.
 * 3. As the memberUser, create a community with a unique slug.
 * 4. As the memberUser, create a membership for that community.
 * 5. Switch back to the adminUser context using admin login.
 * 6. As the adminUser, update the membership's role, approval flag, ban flag, and
 *    leftAt timestamp.
 * 7. Assert that mutable fields are updated while identifiers and immutable
 *    metadata remain stable and that updatedAt has advanced.
 */
export async function test_api_community_membership_update_by_admin(
  connection: api.IConnection,
) {
  // 1. AdminUser join (initial admin creation and authentication)
  const adminUsername: string = RandomGenerator.alphabets(12);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.test.com`;
  const adminPassword: string = "Adm1nPass!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joinedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. MemberUser join (member creation and authentication)
  const memberUsername: string = RandomGenerator.alphabets(10);
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.test.com` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    username: memberUsername as string & tags.MinLength<3> & tags.MaxLength<32>,
    email: memberEmail,
    password: "MemberP@ssw0rd" as string & tags.MinLength<8>,
    ip: null,
    href: "https://app.test.com/signup" as string & tags.Format<"uri">,
    referrer: "https://app.test.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const joinedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(joinedMember);

  // 3. MemberUser creates a community
  const communitySlug: string & tags.MinLength<1> & tags.MaxLength<128> =
    (RandomGenerator.alphabets(10) + "-community") as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;
  const communityName: string & tags.MinLength<1> & tags.MaxLength<255> =
    RandomGenerator.name(2) as string & tags.MinLength<1> & tags.MaxLength<255>;

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }) as string & tags.MaxLength<4000>,
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
  typia.assert(community);

  // 4. MemberUser creates a membership for that community
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const originalMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(originalMembership);

  // Capture original identifiers and timestamps
  const originalMembershipId = originalMembership.id;
  const originalCommunityId = originalMembership.community.id;
  const originalCommunitySlug = originalMembership.community.slug;
  const originalMemberUserId = originalMembership.memberUser.id;
  const originalCreatedAt = originalMembership.createdAt;
  const originalUpdatedAt = originalMembership.updatedAt;

  // 5. Switch back to adminUser using login
  const adminLoginBody = {
    identifier: adminUsername,
    password: adminPassword,
    ip: null,
    href: "https://app.test.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://app.test.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const loggedInAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 6. Admin updates membership moderation attributes
  const newRole = "moderator";
  const now = new Date();
  const futureDate = RandomGenerator.date(now, 1000 * 60 * 60 * 24 * 30);
  const newLeftAt: string & tags.Format<"date-time"> =
    futureDate.toISOString() as string & tags.Format<"date-time">;

  const membershipUpdateBody = {
    role: newRole,
    isApproved: true,
    isBanned: false,
    leftAt: newLeftAt,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const updatedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: originalCommunitySlug,
        membershipId: originalMembershipId,
        body: membershipUpdateBody,
      },
    );
  typia.assert(updatedMembership);

  // 7. Assertions: identifiers and relations remain stable
  TestValidator.equals(
    "membership id remains stable after update",
    updatedMembership.id,
    originalMembershipId,
  );

  TestValidator.equals(
    "community id remains stable after membership update",
    updatedMembership.community.id,
    originalCommunityId,
  );

  TestValidator.equals(
    "community slug remains stable after membership update",
    updatedMembership.community.slug,
    originalCommunitySlug,
  );

  TestValidator.equals(
    "memberUser id remains stable after membership update",
    updatedMembership.memberUser.id,
    originalMemberUserId,
  );

  // Mutable fields reflect new values
  TestValidator.equals(
    "membership role updated to moderator",
    updatedMembership.role,
    newRole,
  );

  TestValidator.equals(
    "membership isApproved set to true",
    updatedMembership.isApproved,
    true,
  );

  TestValidator.equals(
    "membership isBanned set to false",
    updatedMembership.isBanned,
    false,
  );

  TestValidator.equals(
    "membership leftAt updated to specified future timestamp",
    updatedMembership.leftAt,
    newLeftAt,
  );

  // Timestamps: createdAt unchanged, updatedAt is newer or equal
  TestValidator.equals(
    "membership createdAt remains unchanged after update",
    updatedMembership.createdAt,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "membership updatedAt is newer than or equal to original",
    updatedMembership.updatedAt >= originalUpdatedAt,
  );
}
