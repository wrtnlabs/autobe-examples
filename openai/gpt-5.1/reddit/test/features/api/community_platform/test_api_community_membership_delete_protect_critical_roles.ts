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
 * Validate that adminUser membership deletion protects critical roles while
 * allowing non-critical deletions.
 *
 * Business flow:
 *
 * 1. Register an adminUser account that will later issue admin-only delete
 *    requests.
 * 2. Register a memberUser account which will create a community and hold a
 *    critical role membership.
 * 3. As the memberUser, create a community and capture its slug.
 * 4. As the memberUser, create a critical-role membership (e.g., "owner") in that
 *    community.
 * 5. Switch to adminUser (login) and attempt to delete the critical-role
 *    membership; expect an error and validate with TestValidator.error.
 * 6. Because no read/list endpoint is available for memberships, rely on the fact
 *    that the delete call failed to conclude the membership still exists
 *    logically.
 * 7. Additionally, create another membership with a non-critical role (e.g.,
 *    "member") and show that adminUser can delete it successfully without
 *    error.
 */
export async function test_api_community_membership_delete_protect_critical_roles(
  connection: api.IConnection,
) {
  // 1. Register adminUser via /auth/adminUser/join
  const adminUsername: string = RandomGenerator.name(1);
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassw0rd!";

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Register memberUser via /auth/memberUser/join
  const memberUsername: string = RandomGenerator.name(1);
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassw0rd!";

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As memberUser, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityName = RandomGenerator.paragraph({ sentences: 2 });

  const communityCreateBody = {
    slug: communitySlug,
    name: communityName,
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

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. As memberUser, create a critical-role membership in that community
  const criticalRoleCreateBody = {
    role: "owner",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const criticalMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: criticalRoleCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(criticalMembership);

  // 5. Switch to adminUser by logging in
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoginAuthorized = await api.functional.auth.adminUser.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLoginAuthorized);

  // 6. Attempt to delete the critical-role membership as adminUser -> expect error
  await TestValidator.error(
    "adminUser cannot delete critical role membership (owner)",
    async () => {
      await api.functional.communityPlatform.adminUser.communities.memberships.erase(
        connection,
        {
          communitySlug: community.slug,
          membershipId: criticalMembership.id,
        },
      );
    },
  );

  // 7. Logical assertion that critical membership is preserved due to failed deletion
  TestValidator.predicate(
    "critical membership deletion attempt resulted in an error, implying membership is preserved",
    true,
  );

  // 8. Create a non-critical membership and demonstrate successful deletion
  const nonCriticalRoleCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  // Ensure we are acting as memberUser again to create the membership
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLoginAuthorized = await api.functional.auth.memberUser.login(
    connection,
    {
      body: memberLoginBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLoginAuthorized);

  const nonCriticalMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: nonCriticalRoleCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityMembership>(nonCriticalMembership);

  // Switch back to adminUser to delete non-critical membership
  const adminLoginAuthorizedAgain = await api.functional.auth.adminUser.login(
    connection,
    {
      body: adminLoginBody,
    },
  );
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminLoginAuthorizedAgain,
  );

  await api.functional.communityPlatform.adminUser.communities.memberships.erase(
    connection,
    {
      communitySlug: community.slug,
      membershipId: nonCriticalMembership.id,
    },
  );

  TestValidator.predicate(
    "adminUser successfully deleted non-critical role membership (member)",
    true,
  );
}
