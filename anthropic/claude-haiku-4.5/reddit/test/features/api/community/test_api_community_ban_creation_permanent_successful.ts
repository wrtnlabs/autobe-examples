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
 * Test successful creation of a permanent community ban.
 *
 * This test validates that a moderator can successfully issue a permanent ban
 * against a community member for rule violations. The ban is created without an
 * expiration date, making it indefinite until explicitly lifted by a
 * moderator.
 *
 * Workflow:
 *
 * 1. Setup: Create administrator, category, community, moderator, and member
 * 2. Action: Moderator issues a permanent ban against the member
 * 3. Validation: Verify ban is permanent (type='permanent', expires_at is null)
 */
export async function test_api_community_ban_creation_permanent_successful(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
          description: "Technology discussion category",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member and authenticate to create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community by the member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Create member to be banned
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: bannedMemberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "BannedMemberPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(bannedMember);

  // Step 6: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Issue permanent ban
  const reason = "Repeated violation of Rule 5: Be respectful";
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "permanent",
          reason: reason,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 8: Validation
  TestValidator.equals(
    "ban type should be permanent",
    ban.ban_type,
    "permanent",
  );
  TestValidator.equals("ban expires_at should be null", ban.expires_at, null);
  TestValidator.equals("ban reason matches", ban.reason, reason);
  TestValidator.equals(
    "banned member id matches",
    ban.member.id,
    bannedMember.id,
  );
  TestValidator.equals("community id matches", ban.community.id, community.id);
  TestValidator.equals("moderator id matches", ban.moderator.id, moderator.id);
  TestValidator.predicate(
    "ban created_at should be set",
    ban.created_at !== null && ban.created_at !== undefined,
  );
  TestValidator.equals(
    "appeal_submitted_at should be null",
    ban.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal_resolved_at should be null",
    ban.appeal_resolved_at,
    null,
  );
  TestValidator.equals(
    "appeal_approved should be null",
    ban.appeal_approved,
    null,
  );
}
