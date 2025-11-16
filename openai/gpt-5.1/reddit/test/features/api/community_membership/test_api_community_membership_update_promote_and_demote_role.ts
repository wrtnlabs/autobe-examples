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

export async function test_api_community_membership_update_promote_and_demote_role(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const adminLoginIdentifier: string = adminJoinBody.email;

  // 2. Register memberUser (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginIdentifier: string = memberJoinBody.email;
  void memberLoginIdentifier; // reserved for potential future use

  // 3. As memberUser, create a community
  const communitySlug: string = RandomGenerator.alphabets(8);

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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 4. As memberUser, create baseline membership with role "member"
  const baselineMembershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const baselineMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: baselineMembershipCreateBody,
      },
    );
  typia.assert(baselineMembership);

  // Snapshot original fields for later comparison
  const originalId: string = baselineMembership.id;
  const originalCommunityId: string = baselineMembership.community.id;
  const originalMemberUserId: string = baselineMembership.memberUser.id;
  const originalJoinedAt: string = baselineMembership.joinedAt;
  const originalUpdatedAt: string = baselineMembership.updatedAt;

  // 5. Ensure we are authenticated as adminUser (login)
  const adminLoginBody = {
    identifier: adminLoginIdentifier,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginResult: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 6. Promote membership role to "moderator" using admin endpoint
  const promoteBody = {
    role: "moderator",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const promotedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: baselineMembership.id,
        body: promoteBody,
      },
    );
  typia.assert(promotedMembership);

  // 7. Assert promotion results
  TestValidator.equals(
    "promote: membership id should remain the same",
    promotedMembership.id,
    originalId,
  );
  TestValidator.equals(
    "promote: community id should remain the same",
    promotedMembership.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "promote: member user id should remain the same",
    promotedMembership.memberUser.id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "promote: joinedAt should remain the same",
    promotedMembership.joinedAt,
    originalJoinedAt,
  );
  TestValidator.equals(
    "promote: role should be updated to moderator",
    promotedMembership.role,
    "moderator",
  );
  TestValidator.equals(
    "promote: isApproved should be true",
    promotedMembership.isApproved,
    true,
  );
  TestValidator.equals(
    "promote: isBanned should be false",
    promotedMembership.isBanned,
    false,
  );
  TestValidator.predicate(
    "promote: updatedAt should be >= original updatedAt",
    new Date(promotedMembership.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 8. Demote membership role back to "member"
  const demoteBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.IUpdate;

  const demotedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.adminUser.communities.memberships.update(
      connection,
      {
        communitySlug: community.slug,
        membershipId: baselineMembership.id,
        body: demoteBody,
      },
    );
  typia.assert(demotedMembership);

  // 9. Assert demotion results
  TestValidator.equals(
    "demote: membership id should remain the same",
    demotedMembership.id,
    originalId,
  );
  TestValidator.equals(
    "demote: community id should remain the same",
    demotedMembership.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "demote: member user id should remain the same",
    demotedMembership.memberUser.id,
    originalMemberUserId,
  );
  TestValidator.equals(
    "demote: joinedAt should remain the same",
    demotedMembership.joinedAt,
    originalJoinedAt,
  );
  TestValidator.equals(
    "demote: role should be updated back to member",
    demotedMembership.role,
    "member",
  );
  TestValidator.equals(
    "demote: isApproved should still be true",
    demotedMembership.isApproved,
    true,
  );
  TestValidator.equals(
    "demote: isBanned should still be false",
    demotedMembership.isBanned,
    false,
  );
  TestValidator.predicate(
    "demote: updatedAt should be >= promotion updatedAt",
    new Date(demotedMembership.updatedAt).getTime() >=
      new Date(promotedMembership.updatedAt).getTime(),
  );
}
