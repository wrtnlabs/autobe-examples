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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

export async function test_api_discussion_board_articles_list_basic_browsing(
  connection: api.IConnection,
) {
  // 1. Admin user join (also authenticates as adminUser)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryCode = `CAT_${RandomGenerator.alphaNumeric(8)}`;
  const categoryCreateBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Member user join (also authenticates as memberUser)
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 4. Create multiple articles as the member user in that category
  const articleCount = 3;
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const createBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      categoryId: category.id,
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(article);
    createdArticles.push(article);
  }

  // 5. Browse articles via PATCH /discussionBoard/articles with simple pagination
  const pageRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IDiscussionBoardArticle.IRequest;

  const page: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: pageRequest,
    });
  typia.assert(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert(pagination);

  // 6. Validate pagination coherence: page index, limit, page count
  TestValidator.equals(
    "pagination current index should be 0-based first page when requesting page 1",
    pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match requested limit",
    pagination.limit,
    10,
  );

  TestValidator.predicate(
    "pagination.records should be at least the number of created articles",
    pagination.records >= createdArticles.length,
  );
  TestValidator.predicate(
    "pagination.pages should be >= 1 when there are records",
    pagination.records === 0 ? pagination.pages === 0 : pagination.pages >= 1,
  );

  // 7. Ensure that at least one created article appears in the first page data
  const summaries = page.data;
  const summaryIds = summaries.map((s) => s.id);

  const missingIds = createdArticles
    .map((a) => a.id)
    .filter((id) => !summaryIds.includes(id));

  TestValidator.predicate(
    "at least one created article should be present in the first page of summaries",
    missingIds.length < createdArticles.length,
  );

  // 8. Validate summary fields for created articles that appear in the page
  for (const article of createdArticles) {
    const summary = summaries.find((s) => s.id === article.id);
    if (!summary) continue;

    typia.assert(summary);

    // Check basic fields
    TestValidator.equals(
      "summary title matches article title",
      summary.title,
      article.title,
    );

    // Category consistency
    TestValidator.equals(
      "summary category id matches created category id",
      summary.category.id,
      category.id,
    );
    TestValidator.equals(
      "summary category code matches created category code",
      summary.category.code,
      category.code,
    );
    TestValidator.equals(
      "summary category name matches created category name",
      summary.category.name,
      category.name,
    );

    // Author polymorphic union: ensure it has required summary shape
    const author = summary.author;
    typia.assert<
      IDiscussionBoardMemberuser.ISummary | IDiscussionBoardAdminuser.ISummary
    >(author);

    TestValidator.predicate(
      "author id is non-empty string",
      typeof author.id === "string" && author.id.length > 0,
    );

    // Counts are non-negative
    TestValidator.predicate(
      "likeCount is non-negative",
      summary.likeCount >= 0,
    );
    TestValidator.predicate(
      "commentCount is non-negative",
      summary.commentCount >= 0,
    );
  }

  // 9. Validate default ordering: newest first among our created articles that appear in the page
  const summariesForCreated = summaries.filter((s) =>
    createdArticles.some((a) => a.id === s.id),
  );

  if (summariesForCreated.length >= 2) {
    const sortedByCreatedAtDesc = [...summariesForCreated].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );

    TestValidator.equals(
      "summaries for created articles should be sorted by createdAt descending by default",
      summariesForCreated.map((s) => s.id),
      sortedByCreatedAtDesc.map((s) => s.id),
    );
  }
}
