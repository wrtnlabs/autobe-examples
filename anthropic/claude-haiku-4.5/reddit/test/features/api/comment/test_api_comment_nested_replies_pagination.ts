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

export async function test_api_comment_nested_replies_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create a member (authenticated user for posting)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create an administrator for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member authentication for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a root post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post for Comment Pagination",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create a parent comment on the post
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // Step 7: Create 12 nested replies to the parent comment
  const nestedReplies = await ArrayUtil.asyncRepeat(12, async (index) => {
    const reply: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: `Reply ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(reply);
    return reply;
  });

  TestValidator.equals("created 12 nested replies", nestedReplies.length, 12);

  // Step 8.1: Test default pagination (page=1, page_size=20 should return all)
  const defaultPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.equals(
    "default pagination returns page 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit is 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default pagination total records should be at least 12",
    defaultPage.pagination.records >= 12,
    true,
  );
  TestValidator.equals(
    "default pagination total pages is 1 for all records with page_size 20",
    defaultPage.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "default pagination data has at least 12 items",
    defaultPage.data.length >= 12,
  );

  // Step 8.2: Test smaller page_size=5 should split results
  const page1: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page1);
  TestValidator.equals(
    "page 1 with page_size=5 returns page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 with page_size=5 has limit 5",
    page1.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page 1 with page_size=5 total records is at least 12",
    page1.pagination.records >= 12,
  );
  TestValidator.predicate(
    "page 1 with page_size=5 total pages is at least 3",
    page1.pagination.pages >= 3,
  );
  TestValidator.equals(
    "page 1 with page_size=5 data has 5 items",
    page1.data.length,
    5,
  );

  // Step 8.3: Test page 2 should return next batch
  const page2: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 2,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page2);
  TestValidator.equals(
    "page 2 with page_size=5 returns page 2",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 with page_size=5 has limit 5",
    page2.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 with page_size=5 data has 5 items",
    page2.data.length,
    5,
  );
  TestValidator.notEquals(
    "page 2 data differs from page 1 data",
    page2.data[0].id,
    page1.data[0].id,
  );

  // Step 8.4: Test page 3 should have remaining items
  const page3: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 3,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(page3);
  TestValidator.equals(
    "page 3 with page_size=5 returns page 3",
    page3.pagination.current,
    3,
  );
  TestValidator.predicate(
    "page 3 with page_size=5 data has remaining items",
    page3.data.length > 0,
  );

  // Step 8.5: Test page beyond total pages should return fewer items or empty
  const beyondPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 100,
        page_size: 5,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page request returns empty or no data",
    beyondPage.data.length === 0,
  );

  // Step 9: Test edge case with page_size=1
  const pageSizeOne: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 1,
        page_size: 1,
        sort_by: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(pageSizeOne);
  TestValidator.equals(
    "page_size=1 limit is 1",
    pageSizeOne.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "page_size=1 total pages is at least 12",
    pageSizeOne.pagination.pages >= 12,
  );
  TestValidator.equals(
    "page_size=1 data has 1 item",
    pageSizeOne.data.length,
    1,
  );

  // Step 10: Test pagination metadata consistency
  const consistencyPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.comments.comments.index(connection, {
      commentId: parentComment.id,
      body: {
        page: 2,
        page_size: 3,
        sort_by: "best",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(consistencyPage);
  TestValidator.predicate(
    "pagination calculated pages matches expected value",
    consistencyPage.pagination.pages ===
      Math.ceil(
        consistencyPage.pagination.records / consistencyPage.pagination.limit,
      ),
  );
}
