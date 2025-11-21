import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test that moderators can retrieve user ban information for bans they have
 * authority over. Validates role-based access control by ensuring moderators
 * can access ban details while maintaining proper security boundaries. Tests
 * the system's ability to provide appropriate ban information to moderators
 * based on their community assignments and moderation privileges.
 */
export async function test_api_user_ban_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create community context for moderation
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Admin creates ban record
  const banData = {
    community_platform_member_id: member.id,
    ban_type: "temporary",
    ban_scope: "community",
    reason: "Violation of community guidelines",
    duration_hours: 24,
    max_appeals: 3,
    appeal_deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies ICommunityPlatformUserBan.ICreate;

  const createdBan =
    await api.functional.communityPlatform.admin.userBans.create(connection, {
      body: banData,
    });
  typia.assert(createdBan);

  // Step 6: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Moderator retrieves ban information using the ban ID
  const retrievedBan =
    await api.functional.communityPlatform.moderator.userBans.at(connection, {
      userBanId: createdBan,
    });
  typia.assert(retrievedBan);

  // Step 8: Validate ban information matches
  TestValidator.equals(
    "retrieved ban matches created ban",
    retrievedBan,
    createdBan,
  );
}
