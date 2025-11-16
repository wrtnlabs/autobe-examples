import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_retrieval_pagination(
  connection: api.IConnection,
) {
  // Setup: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Setup: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Authenticate as member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphaNumeric(8),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Setup: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create 25 posts
  const createdPosts = await ArrayUtil.asyncRepeat(25, async (index) => {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Test Post ${index + 1}`,
          content_text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    return post;
  });

  TestValidator.predicate(
    "should have created 25 posts",
    () => createdPosts.length === 25,
  );

  // Test 1: First page with limit 10
  const page1: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page1);

  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("page 1 records count", page1.pagination.records, 25);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.predicate("page 1 data length", () => page1.data.length === 10);

  // Test 2: Second page with limit 10
  const page2: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page2);

  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 10);
  TestValidator.equals("page 2 records count", page2.pagination.records, 25);
  TestValidator.equals("page 2 total pages", page2.pagination.pages, 3);
  TestValidator.predicate("page 2 data length", () => page2.data.length === 10);

  // Verify no duplication between page 1 and page 2
  const page1Ids = page1.data.map((p) => p.id);
  const page2Ids = page2.data.map((p) => p.id);
  const duplicates = page1Ids.filter((id) => page2Ids.includes(id));
  TestValidator.predicate(
    "no duplicates between pages",
    () => duplicates.length === 0,
  );

  // Test 3: Third page with remaining posts
  const page3: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 3,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(page3);

  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 10);
  TestValidator.equals("page 3 records count", page3.pagination.records, 25);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);
  TestValidator.predicate("page 3 data length", () => page3.data.length === 5);

  // Test 4: Limit boundary - 1 item per page
  const limitOne: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(limitOne);

  TestValidator.equals("limit 1 current page", limitOne.pagination.current, 1);
  TestValidator.equals("limit 1 limit", limitOne.pagination.limit, 1);
  TestValidator.equals(
    "limit 1 records count",
    limitOne.pagination.records,
    25,
  );
  TestValidator.equals("limit 1 total pages", limitOne.pagination.pages, 25);
  TestValidator.predicate(
    "limit 1 data length",
    () => limitOne.data.length === 1,
  );

  // Test 5: Limit boundary - max 100 items per page (should return 25)
  const limitMax: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(limitMax);

  TestValidator.equals(
    "limit max current page",
    limitMax.pagination.current,
    1,
  );
  TestValidator.equals("limit max limit", limitMax.pagination.limit, 100);
  TestValidator.equals(
    "limit max records count",
    limitMax.pagination.records,
    25,
  );
  TestValidator.equals("limit max total pages", limitMax.pagination.pages, 1);
  TestValidator.predicate(
    "limit max data length",
    () => limitMax.data.length === 25,
  );

  // Test 6: Verify no duplicates across all pages
  const allPageIds = [...page1Ids, ...page2Ids, ...page3.data.map((p) => p.id)];
  const uniqueIds = new Set(allPageIds);
  TestValidator.equals(
    "all page IDs are unique",
    allPageIds.length,
    uniqueIds.size,
  );
}
