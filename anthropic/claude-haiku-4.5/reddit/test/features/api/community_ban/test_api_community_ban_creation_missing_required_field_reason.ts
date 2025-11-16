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
 * Test successful ban creation with all required fields.
 *
 * This test validates that the API correctly creates ban records when a
 * moderator provides all required information including member ID, ban type,
 * and reason field. The test verifies that the ban creation endpoint accepts
 * valid data and returns a properly formed ban record with correct details.
 *
 * Step-by-step process:
 *
 * 1. Register an administrator account
 * 2. Create a category for the test community
 * 3. Register a member account to be banned
 * 4. Create a community as the member
 * 5. Register a moderator account
 * 6. Switch to moderator and create a ban with all required fields
 * 7. Verify the ban was created successfully with correct details
 */
export async function test_api_community_ban_creation_missing_required_field_reason(
  connection: api.IConnection,
) {
  // 1. Register an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/auth/register",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create a category for the test community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `technology_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology discussion",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Register a member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Create a community as the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Register a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 6. Switch to moderator and create a ban with all required fields
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const banReason =
    "Repeated violation of Rule 5: Be respectful and constructive";
  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "permanent",
          reason: banReason,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // 7. Verify the ban was created successfully with correct details
  TestValidator.equals("ban reason matches input", ban.reason, banReason);
  TestValidator.equals("banned member ID matches", ban.member.id, member.id);
  TestValidator.equals("ban type is permanent", ban.ban_type, "permanent");
  TestValidator.equals("community ID matches", ban.community.id, community.id);
  TestValidator.predicate(
    "ban has valid creation timestamp",
    ban.created_at !== null && ban.created_at !== undefined,
  );
}
