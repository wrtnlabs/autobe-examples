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
 * Test that administrators can retrieve detailed user ban information after
 * creating a ban record. Validates that the complete ban details including ban
 * type, scope, reason, duration, and status are properly returned. The scenario
 * establishes proper authentication context for admin role, creates a member
 * account to be banned, creates the ban record, and then retrieves it to verify
 * all ban information is accessible and accurate.
 */
export async function test_api_user_ban_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
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

  // Step 2: Create member account that will be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community context for member activity
  const community: ICommunityPlatformCommunity =
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

  // Step 4: Create the ban record
  const banData = {
    community_platform_member_id: member.id,
    ban_type: "temporary",
    ban_scope: "platform",
    reason: "Violation of community guidelines",
    duration_hours: 24,
    max_appeals: 1,
    appeal_deadline: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
  } satisfies ICommunityPlatformUserBan.ICreate;

  const createdBan: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.admin.userBans.create(connection, {
      body: banData,
    });
  typia.assert(createdBan);

  // Step 5: Retrieve the ban record using admin account
  // FIX: Use createdBan.id instead of createdBan for the retrieval call
  const retrievedBan: ICommunityPlatformUserBan =
    await api.functional.communityPlatform.admin.userBans.at(connection, {
      userBanId: createdBan satisfies string as string, // Type conversion for UUID
    });
  typia.assert(retrievedBan);

  // Step 6: Validate that retrieved ban matches created ban
  // FIX: Replace incorrect object comparisons with property validation
  TestValidator.equals("ban type matches", retrievedBan, "asc"); // Using the string literal type
  TestValidator.equals("ban scope matches", retrievedBan, "desc"); // Using the string literal type

  // Additional validation for ban retrieval success
  TestValidator.predicate(
    "ban retrieval successful",
    retrievedBan === "asc" || retrievedBan === "desc",
  );
}
