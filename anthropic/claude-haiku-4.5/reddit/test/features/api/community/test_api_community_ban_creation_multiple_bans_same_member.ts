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

export async function test_api_community_ban_creation_multiple_bans_same_member(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/moderator/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Setup: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/member/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community as member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Issue first ban - temporary ban
  const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const firstBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Violation of community rules - first offense",
          expires_at: futureDate1.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(firstBan);

  // Validate first ban properties
  TestValidator.equals(
    "first ban member ID matches target member",
    firstBan.member.id,
    member.id,
  );
  TestValidator.equals(
    "first ban type is temporary",
    firstBan.ban_type,
    "temporary",
  );
  TestValidator.predicate(
    "first ban has unique ID",
    firstBan.id !== undefined && firstBan.id.length > 0,
  );
  TestValidator.predicate(
    "first ban has expiration timestamp",
    firstBan.expires_at !== null && firstBan.expires_at !== undefined,
  );

  // Issue second ban - permanent ban against same member
  const secondBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "permanent",
          reason: "Repeated violations - permanent ban issued",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(secondBan);

  // Validate second ban properties
  TestValidator.equals(
    "second ban member ID matches target member",
    secondBan.member.id,
    member.id,
  );
  TestValidator.equals(
    "second ban type is permanent",
    secondBan.ban_type,
    "permanent",
  );
  TestValidator.predicate(
    "second ban has unique ID",
    secondBan.id !== undefined && secondBan.id.length > 0,
  );
  TestValidator.predicate(
    "second ban expires_at is null for permanent ban",
    secondBan.expires_at === null || secondBan.expires_at === undefined,
  );

  // Validate bans are independent records
  TestValidator.notEquals(
    "first and second ban have different IDs",
    firstBan.id,
    secondBan.id,
  );
  TestValidator.notEquals(
    "first and second ban have different created timestamps",
    firstBan.created_at,
    secondBan.created_at,
  );
  TestValidator.equals(
    "both bans reference same member",
    firstBan.member.id,
    secondBan.member.id,
  );
  TestValidator.equals(
    "both bans are in same community",
    firstBan.community.id,
    secondBan.community.id,
  );

  // Validate ban type differences
  TestValidator.predicate(
    "ban types are different - first temporary, second permanent",
    firstBan.ban_type === "temporary" && secondBan.ban_type === "permanent",
  );
}
