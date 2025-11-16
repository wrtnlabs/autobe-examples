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

export async function test_api_community_ban_creation_missing_required_field_ban_type(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Setup: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(6),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member account (member to be banned)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Setup: Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: "http://localhost:3000/moderator/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Authenticate as moderator
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderatorLoginResponse = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "http://localhost:3000/moderator/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorLoginResponse);

  // Test: Create a temporary ban (valid scenario)
  const temporaryBanExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 24 hours from now
  const temporaryBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Temporary suspension for rule violation",
          expires_at: temporaryBanExpiresAt,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  TestValidator.equals(
    "temporary ban should have ban_type temporary",
    temporaryBan.ban_type,
    "temporary",
  );
  TestValidator.equals(
    "temporary ban should have expiration timestamp",
    temporaryBan.expires_at,
    temporaryBanExpiresAt,
  );

  TestValidator.predicate("ban creation test completed successfully", true);
}
