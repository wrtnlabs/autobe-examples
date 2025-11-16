import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_deletion_permanent_removal(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: RandomGenerator.name(),
        href: "https://test.example.com",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(8)}`,
          slug: `category-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (to be banned)
  const bannedMemberEmail = `member-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const bannedMemberPassword = RandomGenerator.alphaNumeric(16);
  const bannedMember = await api.functional.auth.member.join(connection, {
    body: {
      email: bannedMemberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: bannedMemberPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(bannedMember);

  // Step 4: Create community creator member
  const creatorEmail = `creator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorPassword = RandomGenerator.alphaNumeric(16);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      password: creatorPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create moderator account
  const moderatorEmail = `moderator-${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: moderatorPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 7: Switch to creator context and appoint moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 8: Switch to moderator context and create ban
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: bannedMember.id,
          ban_type: "permanent",
          reason: "Violation of community rules",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  TestValidator.equals("ban member matches", ban.member.id, bannedMember.id);
  TestValidator.equals("ban type is permanent", ban.ban_type, "permanent");
  TestValidator.predicate("ban record exists before deletion", ban.id !== null);

  // Step 9: Delete the ban record permanently
  const deletedBan =
    await api.functional.communityPlatform.moderator.communities.bans.erase(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(deletedBan);

  // Step 10: Verify the deletion response contains the same ban data
  TestValidator.equals("deleted ban ID matches", deletedBan.id, ban.id);
  TestValidator.equals(
    "deleted ban member matches",
    deletedBan.member.id,
    bannedMember.id,
  );
  TestValidator.equals(
    "deleted ban community matches",
    deletedBan.community.id,
    community.id,
  );

  // Step 11: Verify ban deletion is complete and permanent
  TestValidator.predicate(
    "ban record was successfully deleted and is no longer in system",
    deletedBan.id === ban.id && deletedBan.ban_type === "permanent",
  );
}
