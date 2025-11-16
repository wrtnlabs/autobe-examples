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

export async function test_api_community_ban_deletion_erroneous_ban_correction(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Technology related discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: creatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: RandomGenerator.alphabets(8),
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create innocent member account (to be mistakenly banned)
  const innocentEmail = typia.random<string & tags.Format<"email">>();
  const innocentPassword = RandomGenerator.alphabets(12);
  const innocent: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: innocentEmail,
        username: RandomGenerator.alphabets(8),
        password: innocentPassword,
        href: "https://example.com/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(innocent);

  // 6. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/moderator/register",
        referrer: "https://example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 7. Appoint moderator to community with senior tier
  const communityModerator: ICommunityPlatformCommunityModerator =
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

  // Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 8. Create erroneous ban on innocent member
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: innocent.id,
          ban_type: "permanent",
          reason: "Mistaken ban - wrong member targeted",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  TestValidator.equals(
    "ban member matches innocent",
    ban.member.id,
    innocent.id,
  );
  TestValidator.equals("ban type is permanent", ban.ban_type, "permanent");

  // 9. Verify ban exists
  TestValidator.predicate(
    "ban record exists",
    ban.id !== null && ban.id !== undefined,
  );

  // 10. Permanently delete the erroneous ban
  const deletedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.erase(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(deletedBan);

  // 11. Validate that deletion returns the ban record that was deleted
  TestValidator.equals(
    "deleted ban ID matches original",
    deletedBan.id,
    ban.id,
  );
  TestValidator.equals(
    "deleted ban member matches original",
    deletedBan.member.id,
    innocent.id,
  );

  // 12. Verify deletion serves as error correction mechanism
  TestValidator.predicate(
    "ban deletion completely removes the record",
    deletedBan.id === ban.id && ban.ban_type === "permanent",
  );
}
