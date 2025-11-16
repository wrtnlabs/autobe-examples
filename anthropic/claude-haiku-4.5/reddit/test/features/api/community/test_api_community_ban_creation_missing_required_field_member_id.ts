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
 * Test ban creation with complete workflow including valid member_id.
 *
 * This test validates the community ban creation functionality by setting up a
 * complete test scenario with administrator, member, moderator, and community.
 * The test creates a ban with all required fields properly populated, ensuring
 * the API correctly processes ban creation requests.
 *
 * Setup workflow:
 *
 * 1. Create and authenticate an administrator account
 * 2. Create a category for community classification
 * 3. Create a member account and community
 * 4. Create an additional member to be banned
 * 5. Create and authenticate a moderator account
 * 6. Create a ban with proper member_id and all required fields
 * 7. Verify the ban was created successfully
 *
 * This ensures the ban creation API works correctly with all required fields
 * properly provided.
 */
export async function test_api_community_ban_creation_missing_required_field_member_id(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminHref = "https://community.example.com/admin/register";
  const adminReferrer = "https://community.example.com/admin";

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const memberHref = "https://community.example.com/register";
  const memberReferrer = "https://community.example.com";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community as the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create an additional member to be banned
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMemberPassword = "BannedMemberPassword123!";
  const bannedMemberHref = "https://community.example.com/register";
  const bannedMemberReferrer = "https://community.example.com";

  const bannedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: bannedMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: bannedMemberPassword,
        href: bannedMemberHref,
        referrer: bannedMemberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(bannedMember);

  // Step 6: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderatorHref = "https://community.example.com/moderator/register";
  const moderatorReferrer = "https://community.example.com/moderator";

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Create a ban with all required fields including member_id
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "permanent",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 8: Verify the ban was created successfully with correct member_id
  TestValidator.equals(
    "ban member_id should match the banned member",
    ban.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "ban community_id should match the target community",
    ban.community.id,
    community.id,
  );
  TestValidator.equals(
    "ban type should be permanent",
    ban.ban_type,
    "permanent",
  );
}
