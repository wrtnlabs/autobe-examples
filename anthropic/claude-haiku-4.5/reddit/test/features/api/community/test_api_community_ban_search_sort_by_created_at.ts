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

export async function test_api_community_ban_search_sort_by_created_at(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin/join",
        referrer: "https://community.example.com/auth",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-category-${RandomGenerator.alphabets(5)}`,
          display_order: 1,
          description: "Test category for ban sorting",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account to create community
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: "https://community.example.com/auth/member/join",
        referrer: "https://community.example.com/auth",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test-community-${RandomGenerator.alphabets(8)}`,
          description: "Community for ban sorting tests",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ModeratorPassword123!",
        href: "https://community.example.com/auth/moderator/join",
        referrer: "https://community.example.com/auth",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 6: Create multiple member accounts to ban
  const banMembers: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const newMember: ICommunityPlatformMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: RandomGenerator.alphabets(8),
          password: "Password123!",
          href: "https://community.example.com/auth/member/join",
          referrer: "https://community.example.com/auth",
        } satisfies ICommunityPlatformMember.ICreate,
      });
    typia.assert(newMember);
    banMembers.push(newMember);
  }

  // Step 7: Create multiple bans with different timestamps
  const createdBans: ICommunityPlatformCommunityBan[] = [];
  for (let i = 0; i < 3; i++) {
    const ban: ICommunityPlatformCommunityBan =
      await api.functional.communityPlatform.moderator.communities.bans.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: banMembers[i].id,
            ban_type: "permanent",
            reason: `Violation reason ${i + 1}: Permanent ban for testing`,
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      );
    typia.assert(ban);
    createdBans.push(ban);

    // Add small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 8: Search bans sorted by created_at descending (newest first)
  const searchDescending: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchDescending);

  // Verify descending order - newest bans should appear first
  TestValidator.equals(
    "descending sort has correct number of results",
    searchDescending.data.length,
    3,
  );

  // Verify timestamps are in descending order
  for (let i = 0; i < searchDescending.data.length - 1; i++) {
    const current = new Date(searchDescending.data[i].createdAt).getTime();
    const next = new Date(searchDescending.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `descending order: ban ${i} should be more recent than ban ${i + 1}`,
      current >= next,
    );
  }

  // Step 9: Search bans sorted by created_at ascending (oldest first)
  const searchAscending: IPageICommunityPlatformCommunityBan.ISummary =
    await api.functional.communityPlatform.moderator.communities.bans.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformCommunityBan.IRequest,
      },
    );
  typia.assert(searchAscending);

  // Verify ascending order - oldest bans should appear first
  TestValidator.equals(
    "ascending sort has correct number of results",
    searchAscending.data.length,
    3,
  );

  // Verify timestamps are in ascending order
  for (let i = 0; i < searchAscending.data.length - 1; i++) {
    const current = new Date(searchAscending.data[i].createdAt).getTime();
    const next = new Date(searchAscending.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `ascending order: ban ${i} should be older than ban ${i + 1}`,
      current <= next,
    );
  }

  // Step 10: Verify that descending and ascending are opposites
  TestValidator.equals(
    "descending and ascending results should have same ban set",
    searchDescending.data[0].id,
    searchAscending.data[2].id,
  );
  TestValidator.equals(
    "first descending should be last ascending",
    searchDescending.data[searchDescending.data.length - 1].id,
    searchAscending.data[0].id,
  );
}
