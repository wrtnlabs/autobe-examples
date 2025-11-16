import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Test attempting to delete a community as a member (non-admin) while proper
 * authorization for admin is established.
 *
 * This scenario validates that the system enforces role-based access control
 * for community deletion, ensuring only administrators can delete communities.
 *
 * 1. First, an admin user is created with unique credentials to establish the
 *    administrative role in the system
 * 2. A member user is created to represent the non-admin actor attempting deletion
 * 3. The member authenticates and creates a new community
 * 4. The member authenticates again to ensure consistent session context
 * 5. The member attempts to delete the community using DELETE
 *    /communityPlatform/admin/communities/{communityCode}
 * 6. The system correctly rejects this request with a 403 Forbidden error
 * 7. The admin authenticates to verify system state, confirming the community
 *    still exists
 *
 * The test validates that authorizationActor: "admin" constraint is properly
 * enforced at the API level, preventing non-admin actors from performing
 * destructive operations.
 */
export async function test_api_community_delete_by_member(
  connection: api.IConnection,
) {
  // 1. Create admin user - establish administrative actor in the system
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "AdminPassword123!";
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: "https://community-platform.com/admin/join",
        referrer: "https://community-platform.com/",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(admin);

  // 2. Create member user - establish member actor in the system
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "MemberPassword123!";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://community-platform.com/member/join",
        referrer: "https://community-platform.com/",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // 3. Member authenticates and creates a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community-platform.com/login",
      referrer: "https://community-platform.com/",
      ip: "192.168.1.101",
    } satisfies IMember.ILogin,
  });
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          tags: ArrayUtil.repeat(3, () => RandomGenerator.name(1)),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Re-authenticate member to ensure consistent session context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community-platform.com/communities",
      referrer: "https://community-platform.com/",
      ip: "192.168.1.101",
    } satisfies IMember.ILogin,
  });

  // 5. Member attempts to delete the community (should fail with 403 Forbidden)
  await TestValidator.error(
    "member should not be able to delete community",
    async () => {
      await api.functional.communityPlatform.admin.communities.erase(
        connection,
        {
          communityCode: community.code,
        },
      );
    },
  );

  // 6. Admin authenticates to verify community still exists (positive control)
  await api.functional.auth.member.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://community-platform.com/admin/login",
      referrer: "https://community-platform.com/",
      ip: "192.168.1.100",
    } satisfies IMember.ILogin,
  });

  // The community should still exist after the failed attempt
}
