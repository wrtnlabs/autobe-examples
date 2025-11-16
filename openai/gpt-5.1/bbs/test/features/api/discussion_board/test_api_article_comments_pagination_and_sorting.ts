import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Validate pagination and sorting of comments on a busy article.
 *
 * Business scenario:
 *
 * - An admin user defines an article category for the board.
 * - A member user joins the discussion board and creates a single article under
 *   that category.
 * - The member then posts many comments on that article so that multiple pages of
 *   comments are required when listing.
 * - The listing endpoint PATCH /discussionBoard/articles/{articleId}/comments is
 *   invoked with different pagination and sorting options to verify that it
 *   slices and orders comments correctly.
 *
 * Steps:
 *
 * 1. Register an admin user (join) and let the SDK attach its token.
 * 2. As admin, create a discussion-board article category.
 * 3. Register a member user (join) to get a member session.
 * 4. As member, create one article under the created category.
 * 5. As member, create N comments (e.g., 17) on that article, capturing their IDs
 *    and createdAt timestamps using typia.assert on each
 *    IDiscussionBoardComment response.
 * 6. Call the comments index endpoint for page=1, limit=10, orderBy="created_at",
 *    orderDirection="asc" and assert:
 *
 *    - Pagination.current === 0 (first page, zero-based)
 *    - Pagination.limit === 10
 *    - Pagination.records === N
 *    - Pagination.pages === Math.ceil(N / 10)
 *    - Data.length === Math.min(10, N)
 *    - Data is sorted by createdAt ascending
 * 7. Call the comments index endpoint for page=2 with same sorting and assert:
 *
 *    - Pagination.current === 1
 *    - Data contains the remaining comments (N - 10 items)
 *    - No overlap of IDs between page 1 and page 2
 * 8. Call the index endpoint again with page=1 but orderDirection="desc" and
 *    assert:
 *
 *    - Data is sorted by createdAt descending
 *    - Data[0] has a createdAt greater than or equal to all other comments returned
 *         in this page
 * 9. Cross-check that the union of IDs from asc pages equals the set of IDs
 *    observed when creating comments.
 */
export async function test_api_article_comments_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // 3. Register a member user (join)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member, create one article under the created category
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  // 5. As member, create N comments on that article
  const commentCount = 17;
  const createdComments: IDiscussionBoardComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentBody = {
      body: `Comment #${i + 1}: ${RandomGenerator.paragraph({
        sentences: 3,
      })}`,
    } satisfies IDiscussionBoardComment.ICreate;

    const created: IDiscussionBoardComment =
      await api.functional.discussionBoard.memberUser.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: commentBody,
        },
      );
    typia.assert(created);
    createdComments.push(created);
  }

  // Sort local copies by created_at to have a ground truth ordering
  const ascByCreatedAt = [...createdComments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  // 6. Call comments index for page=1, limit=10, asc
  const page1AscRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IDiscussionBoardComment.IRequest;

  const page1Asc: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: page1AscRequest,
    });
  typia.assert(page1Asc);

  const pagination1 = page1Asc.pagination;
  const data1 = page1Asc.data;

  // pagination assertions
  TestValidator.equals(
    "page1 current should be 0 (zero-based)",
    pagination1.current,
    0,
  );
  TestValidator.equals("page1 limit should be 10", pagination1.limit, 10);
  TestValidator.equals(
    "pagination.records should equal total commentCount",
    pagination1.records,
    commentCount,
  );

  const expectedPages = Math.ceil(commentCount / 10);
  TestValidator.equals(
    "pagination.pages should match ceil(commentCount/limit)",
    pagination1.pages,
    expectedPages,
  );

  TestValidator.equals(
    "page1 data length should be min(limit, commentCount)",
    data1.length,
    Math.min(10, commentCount),
  );

  // data1 should correspond to earliest 10 comments in ascByCreatedAt
  const expectedPage1Ids = ascByCreatedAt.slice(0, 10).map((c) => c.id);
  const actualPage1Ids = data1.map((s) => s.id);

  TestValidator.equals(
    "page1 IDs should equal earliest 10 comment IDs in asc order",
    actualPage1Ids,
    expectedPage1Ids,
  );

  // ensure data1 sorted by createdAt ascending
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1].createdAt;
    const curr = data1[i].createdAt;
    TestValidator.predicate(
      `page1 ascending order at index ${i}`,
      prev <= curr,
    );
  }

  // 7. Call comments index for page=2, same sorting
  const page2AscRequest = {
    page: 2,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "asc",
  } satisfies IDiscussionBoardComment.IRequest;

  const page2Asc: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: page2AscRequest,
    });
  typia.assert(page2Asc);

  const pagination2 = page2Asc.pagination;
  const data2 = page2Asc.data;

  TestValidator.equals(
    "page2 current should be 1 (zero-based)",
    pagination2.current,
    1,
  );
  TestValidator.equals("page2 limit should be 10", pagination2.limit, 10);
  TestValidator.equals(
    "page2 records should equal total commentCount",
    pagination2.records,
    commentCount,
  );

  const expectedPage2Length = Math.max(commentCount - 10, 0);
  TestValidator.equals(
    "page2 data length should be remaining comments",
    data2.length,
    expectedPage2Length,
  );

  const expectedPage2Ids = ascByCreatedAt.slice(10).map((c) => c.id);
  const actualPage2Ids = data2.map((s) => s.id);

  TestValidator.equals(
    "page2 IDs should equal remaining comment IDs in asc order",
    actualPage2Ids,
    expectedPage2Ids,
  );

  // Ensure no overlap between page1 and page2 IDs
  const page1IdSet = new Set(actualPage1Ids);
  const hasOverlap = actualPage2Ids.some((id) => page1IdSet.has(id));
  TestValidator.predicate(
    "page1 and page2 should have no overlapping IDs",
    hasOverlap === false,
  );

  // 8. Call index with desc ordering on page=1
  const page1DescRequest = {
    page: 1,
    limit: 10,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IDiscussionBoardComment.IRequest;

  const page1Desc: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: page1DescRequest,
    });
  typia.assert(page1Desc);

  const dataDesc = page1Desc.data;
  TestValidator.equals(
    "desc page1 data length should be min(limit, commentCount)",
    dataDesc.length,
    Math.min(10, commentCount),
  );

  // Ensure dataDesc sorted by createdAt descending
  for (let i = 1; i < dataDesc.length; i++) {
    const prev = dataDesc[i - 1].createdAt;
    const curr = dataDesc[i].createdAt;
    TestValidator.predicate(
      `page1 descending order at index ${i}`,
      prev >= curr,
    );
  }

  // 9. Cross-check that union of IDs from asc pages equals created comment IDs
  const allAscIds = [...actualPage1Ids, ...actualPage2Ids];
  const allAscIdSet = new Set(allAscIds);
  const createdIdSet = new Set(createdComments.map((c) => c.id));

  TestValidator.equals(
    "union of asc page IDs should cover all created comment IDs",
    allAscIdSet.size,
    createdIdSet.size,
  );
}
