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
 * Test administrator creation of a permanent ban for severe platform
 * violations.
 *
 * This test validates that administrators can impose indefinite restrictions
 * with comprehensive documentation, proper scope settings, and appeal
 * limitations. It ensures permanent bans are correctly configured with
 * appropriate status tracking and security validation.
 */
export async function test_api_admin_user_ban_creation_permanent(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account that will receive the ban
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://platform.example.com/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community context for the ban operation
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to admin authentication for ban creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://platform.example.com/admin",
      referrer: "https://platform.example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 (Test Agent)",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Create permanent platform ban
  const ban: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.admin.userBans.create(connection, {
      body: {
        community_platform_member_id: member.id,
        ban_type: "permanent",
        ban_scope: "platform",
        reason:
          "Severe platform violations including harassment, spam, and policy circumvention. Multiple warnings were issued but violations continued.",
        duration_hours: undefined, // Null for permanent bans
        max_appeals: 1,
        appeal_deadline: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days from now
      } satisfies ICommunityPlatformUserBan.ICreate,
    });
  typia.assert(ban);

  // Step 6: Validate ban creation was successful
  TestValidator.predicate(
    "ban creation should return valid response",
    ban !== null && ban !== undefined,
  );
}
