import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test ban creation with an invalid member ID.
 *
 * Validates that the community ban creation endpoint properly rejects attempts
 * to ban members with non-existent member IDs. The API should prevent creation
 * of bans for members that don't exist in the system.
 *
 * Workflow:
 *
 * 1. Create administrator and register account
 * 2. Create a community category
 * 3. Create a member and establish a community
 * 4. Register a moderator for ban operations
 * 5. Attempt to create a ban with a non-existent member_id
 * 6. Verify the API rejects the invalid member reference
 */
export async function test_api_community_ban_creation_invalid_member_id(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: "Test Admin",
      href: "https://example.com/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a community category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and establish community
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: "MemberPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Register moderator account for ban operations
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `mod_${RandomGenerator.alphaNumeric(6)}`,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Switch to moderator authentication context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Attempt to create a ban with non-existent member ID
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should reject ban creation with non-existent member ID",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: invalidMemberId,
            ban_type: "permanent",
            reason: "Testing invalid member ID rejection",
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      );
    },
  );
}
