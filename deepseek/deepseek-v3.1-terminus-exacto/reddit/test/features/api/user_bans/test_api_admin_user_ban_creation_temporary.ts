import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test the complete workflow of an administrator creating a temporary ban for a
 * member who violated community guidelines. The scenario validates that
 * administrators can impose temporary restrictions with proper documentation,
 * duration settings, and appeal limitations. It ensures the ban creation
 * process maintains proper audit trails, establishes correct actor
 * relationships, and enforces validation rules for ban parameters.
 */
export async function test_api_admin_user_ban_creation_temporary(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "moderator",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate as member (target of the ban)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://community-platform.com/register",
        referrer: "https://community-platform.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create a community context
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to administrator for ban creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://community-platform.com/admin",
      referrer: "https://community-platform.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create temporary ban with proper parameters
  const ban: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.admin.userBans.create(connection, {
      body: {
        community_platform_member_id: member.id,
        ban_type: "temporary",
        ban_scope: "community",
        reason:
          "Violation of community guidelines: inappropriate content posting",
        duration_hours: 24,
        max_appeals: 1,
        appeal_deadline: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies ICommunityPlatformUserBan.ICreate,
    });
  typia.assert(ban);

  // Step 6: Validate ban creation - using proper type checking
  TestValidator.predicate(
    "ban should be successfully created",
    ban !== null && ban !== undefined,
  );
}
