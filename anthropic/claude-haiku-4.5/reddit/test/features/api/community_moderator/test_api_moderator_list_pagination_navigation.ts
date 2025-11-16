import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

export async function test_api_moderator_list_pagination_navigation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberData = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: memberPassword,
    href: "http://localhost/register",
    referrer: "http://localhost",
  } satisfies ICommunityPlatformMember.ICreate;

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(authenticatedMember);
  TestValidator.equals(
    "member authenticated",
    typeof authenticatedMember.id,
    "string",
  );

  // 2. Create and authenticate an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminData = {
    email: adminEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: adminPassword,
    name: RandomGenerator.name(),
    href: "http://localhost/admin/register",
    referrer: "http://localhost/admin",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const authenticatedAdmin = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(authenticatedAdmin);
  TestValidator.equals(
    "admin authenticated",
    typeof authenticatedAdmin.id,
    "string",
  );

  // 3. Create a category (as admin)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost/admin/login",
      referrer: "http://localhost/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          description: "Tech discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Switch back to member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech-discuss-" + RandomGenerator.alphaNumeric(6),
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create multiple moderators for pagination testing (30 moderators)
  const moderatorMembers = await ArrayUtil.asyncRepeat(30, async (index) => {
    const modEmail = typia.random<string & tags.Format<"email">>();
    const modData = {
      email: modEmail,
      username: `mod_${index}_${RandomGenerator.alphaNumeric(6)}`,
      password: "ModPassword123!",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate;

    const newMod = await api.functional.auth.member.join(connection, {
      body: modData,
    });
    typia.assert(newMod);
    return newMod;
  });

  // Appoint all members as moderators
  const createdModerators = await ArrayUtil.asyncRepeat(30, async (index) => {
    const moderator =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: moderatorMembers[index].id,
            tier: index < 10 ? "senior" : "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    return moderator;
  });

  // 6. Test pagination with limit=10, page=1
  const page1Limit10 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Limit10);
  TestValidator.equals(
    "page 1 limit 10 - current page",
    page1Limit10.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 - limit",
    page1Limit10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 - records count",
    page1Limit10.data.length,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 - total records",
    page1Limit10.pagination.records,
    30,
  );
  TestValidator.equals(
    "page 1 limit 10 - total pages",
    page1Limit10.pagination.pages,
    3,
  );

  // 7. Test pagination page 2
  const page2Limit10 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2Limit10);
  TestValidator.equals(
    "page 2 limit 10 - current page",
    page2Limit10.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 - records count",
    page2Limit10.data.length,
    10,
  );
  TestValidator.predicate(
    "page 2 data different from page 1",
    page2Limit10.data[0].member.id !== page1Limit10.data[0].member.id,
  );

  // 8. Test last page with partial results
  const page3Limit10 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 3,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page3Limit10);
  TestValidator.equals(
    "page 3 limit 10 - current page",
    page3Limit10.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 limit 10 - records count",
    page3Limit10.data.length,
    10,
  );

  // 9. Test pagination with limit=15
  const page1Limit15 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Limit15);
  TestValidator.equals(
    "page 1 limit 15 - total pages",
    page1Limit15.pagination.pages,
    2,
  );
  TestValidator.equals(
    "page 1 limit 15 - records count",
    page1Limit15.data.length,
    15,
  );

  // 10. Test second page with limit=15
  const page2Limit15 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 15,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page2Limit15);
  TestValidator.equals(
    "page 2 limit 15 - current page",
    page2Limit15.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 15 - records count",
    page2Limit15.data.length,
    15,
  );

  // 11. Test pagination with sorting by appointedAt ascending
  const sortedAscending =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedAscending);
  TestValidator.equals(
    "sorted ascending - records count",
    sortedAscending.data.length,
    10,
  );

  // 12. Test pagination with sorting by appointedAt descending
  const sortedDescending =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedDescending);
  TestValidator.equals(
    "sorted descending - records count",
    sortedDescending.data.length,
    10,
  );

  // 13. Test filtering by tier
  const seniorModsPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(seniorModsPage);
  TestValidator.predicate(
    "senior moderators filtered correctly",
    seniorModsPage.data.every((mod) => mod.moderator_tier === "senior"),
  );

  // 14. Test page beyond available range returns empty or first page
  const beyondPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 100,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page request handled",
    beyondPage.data.length === 0 || beyondPage.pagination.current === 100,
  );

  // 15. Test maximum limit constraint (100)
  const maxLimitPage =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit respected",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "all records in max limit",
    maxLimitPage.data.length <= 100,
  );

  // 16. Verify data consistency across pages
  const allModsPage1 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 30,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(allModsPage1);
  const allModsPage1Ids = allModsPage1.data.map((m) => m.id);

  const page1Of10 =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Of10);
  const page1Ids = page1Of10.data.map((m) => m.id);

  TestValidator.predicate(
    "first 10 match in full retrieval",
    page1Ids.every((id, idx) => id === allModsPage1Ids[idx]),
  );
}
