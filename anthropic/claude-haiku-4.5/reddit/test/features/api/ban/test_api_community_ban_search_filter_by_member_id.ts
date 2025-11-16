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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";

export async function test_api_community_ban_search_filter_by_member_id(
  connection: api.IConnection,
) {
  // Step 1: Register moderator for ban management
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphaNumeric(8)}`,
        password: "ModPassword123!",
        href: "https://test.example.com/auth/moderator/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Register administrator for category creation
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        password: "AdminPassword123!",
        name: "Test Admin",
        href: "https://test.example.com/auth/admin/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Switch to admin and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://test.example.com/auth/admin/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test_cat_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Register member1 (to be banned)
  const member1Email = `member1_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: `user1_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPass123!",
        href: "https://test.example.com/auth/member/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Step 5: Register member2 (for filtering contrast)
  const member2Email = `member2_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: `user2_${RandomGenerator.alphaNumeric(8)}`,
        password: "MemberPass123!",
        href: "https://test.example.com/auth/member/join",
        referrer: "https://test.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 6: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test_comm_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for ban filtering test",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 7: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModPassword123!",
      href: "https://test.example.com/auth/mod/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 8: Create temporary ban for member1
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  const tempBan1: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member1.id,
          ban_type: "temporary",
          reason: "Spam posting - first violation",
          expires_at: futureDate.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(tempBan1);

  // Step 9: Create permanent ban for member1
  const permBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member1.id,
          ban_type: "permanent",
          reason: "Repeated harassment of community members",
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(permBan);

  // Step 10: Create another temporary ban for member1
  const tempBan2: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member1.id,
          ban_type: "temporary",
          reason: "Off-topic content",
          expires_at: futureDate.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(tempBan2);

  // Step 11: Create ban for member2 (for filtering contrast)
  const member2Ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member2.id,
          ban_type: "temporary",
          reason: "Inappropriate language",
          expires_at: futureDate.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(member2Ban);

  // Step 12: Search for bans filtered by member1 ID
  const member1BansPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
          member_id: member1.id,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(member1BansPage);

  // Step 13: Validate member1 bans are returned
  TestValidator.equals(
    "member1 should have exactly 3 bans",
    member1BansPage.data.length,
    3,
  );

  // Step 14: Validate all returned bans belong to member1
  for (const ban of member1BansPage.data) {
    TestValidator.equals(
      "all bans in result should belong to member1",
      ban.member.id,
      member1.id,
    );
  }

  // Step 15: Verify member2's ban is NOT in member1's results
  const member2BanExists = member1BansPage.data.some(
    (ban) => ban.member.id === member2.id,
  );
  TestValidator.predicate(
    "member2 ban should not appear in member1 filtered results",
    !member2BanExists,
  );

  // Step 16: Validate ban details (check ban types and reasons)
  const tempBans = member1BansPage.data.filter(
    (b) => b.banType === "temporary",
  );
  const permBans = member1BansPage.data.filter(
    (b) => b.banType === "permanent",
  );

  TestValidator.equals(
    "member1 should have 2 temporary bans",
    tempBans.length,
    2,
  );
  TestValidator.equals(
    "member1 should have 1 permanent ban",
    permBans.length,
    1,
  );

  // Step 17: Search for bans filtered by member2 ID to verify different results
  const member2BansPage: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
          member_id: member2.id,
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(member2BansPage);

  // Step 18: Validate member2 has exactly 1 ban
  TestValidator.equals(
    "member2 should have exactly 1 ban",
    member2BansPage.data.length,
    1,
  );

  // Step 19: Validate member1's bans are NOT in member2's results
  const member1BanInMember2Results = member2BansPage.data.some(
    (ban) => ban.member.id === member1.id,
  );
  TestValidator.predicate(
    "member1 bans should not appear in member2 filtered results",
    !member1BanInMember2Results,
  );

  // Step 20: Verify pagination info
  TestValidator.predicate(
    "pagination should indicate correct current page",
    member1BansPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have correct limit",
    member1BansPage.pagination.limit === 50,
  );
}
