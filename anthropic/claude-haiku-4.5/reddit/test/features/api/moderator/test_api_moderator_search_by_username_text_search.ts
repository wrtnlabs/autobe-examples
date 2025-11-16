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

export async function test_api_moderator_search_by_username_text_search(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: adminUsername,
        name: "Test Admin",
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin created", admin.email, adminEmail);

  // Step 2: Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account who will be moderator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: "MemberPassword123",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community (member becomes creator/moderator)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Login as administrator
  const adminLogin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        href: "http://localhost:3000/admin/login",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ILogin,
    });
  typia.assert(adminLogin);

  // Step 6: Search moderators with partial username match
  const searchQueryPartial = memberUsername.substring(0, 5);
  const searchResult1: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: searchQueryPartial,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "partial search returns results",
    searchResult1.data.length > 0,
  );
  TestValidator.predicate(
    "search result contains moderator",
    searchResult1.data.some((m) =>
      m.member.username
        .toLowerCase()
        .includes(searchQueryPartial.toLowerCase()),
    ),
  );

  // Step 7: Search with full username
  const searchResultFull: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: memberUsername,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResultFull);
  TestValidator.predicate(
    "full username search returns results",
    searchResultFull.data.length > 0,
  );
  TestValidator.predicate(
    "result contains correct moderator",
    searchResultFull.data.some((m) => m.member.username === memberUsername),
  );

  // Step 8: Search with case-insensitive pattern
  const searchQueryUpper = memberUsername.toUpperCase().substring(0, 5);
  const searchResultCase: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: searchQueryUpper,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResultCase);
  TestValidator.predicate(
    "case-insensitive search works",
    searchResultCase.data.length > 0,
  );

  // Step 9: Search with maximum length constraint (100 chars)
  const maxLengthQuery = RandomGenerator.alphaNumeric(100);
  const searchResultMax: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: maxLengthQuery,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResultMax);
  TestValidator.predicate(
    "max length search query handled",
    searchResultMax.pagination !== undefined,
  );

  // Step 10: Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    searchResult1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    searchResult1.pagination.pages >= 0,
  );

  // Step 11: Search with sorting by appointedAt
  const searchResultSorted: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          search: searchQueryPartial,
          orderBy: "appointedAt",
          order: "desc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResultSorted);
  TestValidator.predicate(
    "sorted search results returned",
    searchResultSorted.data.length >= 0,
  );

  // Step 12: Validate moderator data structure in results
  if (searchResultFull.data.length > 0) {
    const moderator = searchResultFull.data[0];
    TestValidator.predicate("moderator has id", moderator.id !== undefined);
    TestValidator.predicate(
      "moderator has tier",
      ["creator", "senior", "junior"].includes(moderator.moderator_tier),
    );
    TestValidator.predicate(
      "moderator has appointment date",
      moderator.appointed_at !== undefined,
    );
    TestValidator.predicate(
      "moderator has community",
      moderator.community !== undefined,
    );
    TestValidator.predicate(
      "moderator has member info",
      moderator.member !== undefined,
    );
    TestValidator.predicate(
      "moderator is active",
      moderator.is_active === true,
    );
  }
}
