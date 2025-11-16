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

export async function test_api_moderator_search_pagination_navigation(
  connection: api.IConnection,
) {
  // Authenticate as administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(5),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Authenticate as member to create a community
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: "testmember" + RandomGenerator.alphaNumeric(5),
        password: "TestPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: "tech-" + RandomGenerator.alphaNumeric(8),
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to admin account for moderator search operations
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: admin.email,
      password: "TestPassword123!",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000/admin",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Test pagination with page size 1
  const page1Result: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 1);
  TestValidator.predicate(
    "page 1 data length valid",
    page1Result.data.length <= 1,
  );
  TestValidator.predicate(
    "page 1 pagination pages calculated",
    page1Result.pagination.pages >= 1,
  );

  // Test pagination with page size 5
  const page5Result: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page5Result);
  TestValidator.equals(
    "page 5 current page",
    page5Result.pagination.current,
    1,
  );
  TestValidator.equals("page 5 limit", page5Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 5 records non-negative",
    page5Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 5 pages calculated",
    page5Result.pagination.pages ===
      Math.ceil(page5Result.pagination.records / 5),
  );

  // Test pagination with page size 10
  const page10Result: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page10Result);
  TestValidator.equals(
    "page 10 current page",
    page10Result.pagination.current,
    1,
  );
  TestValidator.equals("page 10 limit", page10Result.pagination.limit, 10);
  TestValidator.predicate("page 10 data valid", page10Result.data.length <= 10);

  // Test pagination with page size 50
  const page50Result: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page50Result);
  TestValidator.equals(
    "page 50 current page",
    page50Result.pagination.current,
    1,
  );
  TestValidator.equals("page 50 limit", page50Result.pagination.limit, 50);
  TestValidator.predicate(
    "page 50 pages calculated",
    page50Result.pagination.pages ===
      Math.ceil(page50Result.pagination.records / 50),
  );

  // Test pagination with maximum page size 100
  const page100Result: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(page100Result);
  TestValidator.equals(
    "page 100 current page",
    page100Result.pagination.current,
    1,
  );
  TestValidator.equals("page 100 limit", page100Result.pagination.limit, 100);
  TestValidator.predicate(
    "total pages calculation accurate",
    page100Result.pagination.pages ===
      Math.ceil(page100Result.pagination.records / 100),
  );

  // Test navigation to second page when available
  if (page50Result.pagination.pages >= 2) {
    const page2Result: IPageICommunityPlatformCommunityModerator.ISummary =
      await api.functional.communityPlatform.administrator.communities.moderators.index(
        connection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: 50,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current page",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit", page2Result.pagination.limit, 50);
  }

  // Test requesting page beyond total pages
  const beyondPageResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "beyond page returns valid result",
    beyondPageResult.data.length >= 0,
  );
  TestValidator.predicate(
    "beyond page current page set correctly",
    beyondPageResult.pagination.current === 999,
  );

  // Test pagination with sorting by appointedAt descending
  const sortedDescResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
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
  typia.assert(sortedDescResult);
  TestValidator.equals(
    "sorted desc current page",
    sortedDescResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted desc limit",
    sortedDescResult.pagination.limit,
    10,
  );

  // Test pagination with sorting by appointedAt ascending
  const sortedAscResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
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
  typia.assert(sortedAscResult);
  TestValidator.equals(
    "sorted asc current page",
    sortedAscResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sorted asc limit",
    sortedAscResult.pagination.limit,
    10,
  );

  // Test minimum page size
  const minPageResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(minPageResult);
  TestValidator.equals("min page limit", minPageResult.pagination.limit, 1);
  TestValidator.predicate(
    "min page data valid",
    minPageResult.data.length <= 1,
  );

  // Test pagination metadata consistency across different limits
  TestValidator.predicate(
    "total records consistent",
    page1Result.pagination.records === page5Result.pagination.records,
  );
  TestValidator.predicate(
    "total records consistent 5-10",
    page5Result.pagination.records === page10Result.pagination.records,
  );
  TestValidator.predicate(
    "total records consistent 10-50",
    page10Result.pagination.records === page50Result.pagination.records,
  );
  TestValidator.predicate(
    "total records consistent 50-100",
    page50Result.pagination.records === page100Result.pagination.records,
  );
}
