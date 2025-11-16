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

export async function test_api_community_ban_creation_temporary_successful(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Administrator creates a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Member registration and login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: "MemberPassword123!",
      href: "https://example.com/member/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Moderator registration and login
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: "ModeratorPassword123!",
      href: "https://example.com/moderator/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Create temporary ban for member in community
  const sevenDaysFromNow = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const banReason =
    "Repeated violation of community rules regarding respectful discourse";

  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: banReason,
          expires_at: sevenDaysFromNow,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 7: Validate ban properties
  TestValidator.equals("ban type is temporary", ban.ban_type, "temporary");
  TestValidator.equals("ban reason matches", ban.reason, banReason);
  TestValidator.equals("moderator id matches", ban.moderator.id, moderator.id);
  TestValidator.equals("member id matches", ban.member.id, member.id);
  TestValidator.equals("community id matches", ban.community.id, community.id);
  TestValidator.predicate(
    "created_at is set",
    ban.created_at !== null && ban.created_at !== undefined,
  );
  TestValidator.equals(
    "expires_at matches specified time",
    ban.expires_at,
    sevenDaysFromNow,
  );
  TestValidator.equals(
    "appeal_submitted_at is null",
    ban.appeal_submitted_at,
    null,
  );
  TestValidator.equals(
    "appeal_resolved_at is null",
    ban.appeal_resolved_at,
    null,
  );
  TestValidator.equals("appeal_approved is null", ban.appeal_approved, null);
}
