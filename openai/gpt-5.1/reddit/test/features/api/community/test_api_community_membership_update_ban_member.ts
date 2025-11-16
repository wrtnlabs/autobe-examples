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

export async function test_api_community_membership_update_ban_member(
  connection: api.IConnection,
) {
  // 1. Create a memberUser (who will own the community and be the target member)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberUser);

  // 2. With memberUser session, create a community
  const communitySlug = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug,
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
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "created community slug should match requested slug",
    community.slug,
    communitySlug,
  );

  // 3. Create a membership for that community via the memberUser context
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

  TestValidator.equals(
    "new membership should be approved",
    createdMembership.isApproved,
    true,
  );
  TestValidator.equals(
    "new membership should not be banned",
    createdMembership.isBanned,
    false,
  );

  const originalMembershipId = createdMembership.id;
  const originalRole = createdMembership.role;
  const originalJoinedAt = createdMembership.joinedAt;

  // 4. Create an adminUser and authenticate
  const adminPassword = "AdminPassw0rd!";
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // Explicit login path as adminUser to exercise login and ensure token switching
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAfterLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAfterLogin);
  TestValidator.equals(
    "admin id should remain stable between join and login",
    adminAfterLogin.id,
    adminAuthorized.id,
  );

  // 5. As adminUser, ban the membership via update (set isBanned=true)
  const banUpdateBody = {
    isBanned: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const bannedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: originalMembershipId,
        body: banUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(bannedMembership);

  TestValidator.equals(
    "banned membership id should remain the same",
    bannedMembership.id,
    originalMembershipId,
  );
  TestValidator.equals(
    "banned membership role should remain unchanged",
    bannedMembership.role,
    originalRole,
  );
  TestValidator.equals(
    "banned membership joinedAt should remain unchanged",
    bannedMembership.joinedAt,
    originalJoinedAt,
  );
  TestValidator.equals(
    "membership should now be banned",
    bannedMembership.isBanned,
    true,
  );

  // 6. As adminUser, unban and approve the membership again
  const unbanUpdateBody = {
    isBanned: false,
    isApproved: true,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const unbannedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: originalMembershipId,
        body: unbanUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(unbannedMembership);

  TestValidator.equals(
    "unbanned membership id should remain the same",
    unbannedMembership.id,
    originalMembershipId,
  );
  TestValidator.equals(
    "unbanned membership role should remain unchanged",
    unbannedMembership.role,
    originalRole,
  );
  TestValidator.equals(
    "unbanned membership joinedAt should remain unchanged",
    unbannedMembership.joinedAt,
    originalJoinedAt,
  );
  TestValidator.equals(
    "membership should no longer be banned",
    unbannedMembership.isBanned,
    false,
  );
  TestValidator.equals(
    "membership should be approved after unban",
    unbannedMembership.isApproved,
    true,
  );
}
