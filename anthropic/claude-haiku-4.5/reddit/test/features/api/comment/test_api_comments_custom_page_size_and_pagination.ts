import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comments_custom_page_size_and_pagination(
  connection: api.IConnection,
) {
  // Setup: Create administrator
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/admin",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123",
        href: "http://localhost:3000/join",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(12),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create 120 comments to span multiple pages
  const commentIds: string[] = [];
  for (let i = 0; i < 120; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: `Test comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    commentIds.push(comment.id);
  }

  // Test 1: Request with page_size = 1
  const page1Size1: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1Size1);
  TestValidator.equals(
    "page_size 1 should return limit of 1",
    page1Size1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page_size 1 should return 1 comment",
    page1Size1.data.length,
    1,
  );
  TestValidator.predicate(
    "total pages should be at least 120 for page_size 1",
    page1Size1.pagination.pages >= 120,
  );

  // Test 2: Request with page_size = 10
  const page1Size10: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 10,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1Size10);
  TestValidator.equals(
    "page_size 10 should return limit of 10",
    page1Size10.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page_size 10 should return 10 comments",
    page1Size10.data.length,
    10,
  );
  TestValidator.predicate(
    "total records should be 120",
    page1Size10.pagination.records === 120,
  );
  TestValidator.predicate(
    "total pages should be 12 for 120 records with page_size 10",
    page1Size10.pagination.pages === 12,
  );

  // Test 3: Request with page_size = 50
  const page1Size50: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1Size50);
  TestValidator.equals(
    "page_size 50 should return limit of 50",
    page1Size50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "page_size 50 should return 50 comments",
    page1Size50.data.length,
    50,
  );
  TestValidator.predicate(
    "total pages should be 3 for 120 records with page_size 50",
    page1Size50.pagination.pages === 3,
  );

  // Test 4: Request with page_size = 100 (maximum)
  const page1Size100: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1Size100);
  TestValidator.equals(
    "page_size 100 should return limit of 100",
    page1Size100.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page_size 100 should return 100 comments",
    page1Size100.data.length,
    100,
  );
  TestValidator.predicate(
    "total pages should be 2 for 120 records with page_size 100",
    page1Size100.pagination.pages === 2,
  );

  // Test 5: Request page 2 with page_size 50
  const page2Size50: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 2,
        page_size: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page2Size50);
  TestValidator.equals(
    "page 2 current page should be 2",
    page2Size50.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit should be 50",
    page2Size50.pagination.limit,
    50,
  );
  TestValidator.equals(
    "page 2 should return 50 comments",
    page2Size50.data.length,
    50,
  );

  // Test 6: Request page 3 with page_size 50 (last page with fewer items)
  const page3Size50: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 3,
        page_size: 50,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page3Size50);
  TestValidator.equals(
    "page 3 current page should be 3",
    page3Size50.pagination.current,
    3,
  );
  TestValidator.equals(
    "page 3 should return 20 comments (remaining)",
    page3Size50.data.length,
    20,
  );
  TestValidator.predicate(
    "total records consistency on page 3",
    page3Size50.pagination.records === 120,
  );

  // Test 7: Request page 2 with page_size 100 (last page)
  const page2Size100: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 2,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page2Size100);
  TestValidator.equals(
    "page 2 size 100 current page should be 2",
    page2Size100.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 size 100 should return 20 comments",
    page2Size100.data.length,
    20,
  );
  TestValidator.predicate(
    "page 2 size 100 total pages should be 2",
    page2Size100.pagination.pages === 2,
  );

  // Test 8: Verify pagination metadata consistency across different page sizes
  const consistencyCheck: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 25,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(consistencyCheck);
  TestValidator.equals(
    "records count should be consistent (120)",
    consistencyCheck.pagination.records,
    120,
  );
  TestValidator.predicate(
    "total pages should be 5 for 120 records with page_size 25",
    consistencyCheck.pagination.pages === 5,
  );
}
