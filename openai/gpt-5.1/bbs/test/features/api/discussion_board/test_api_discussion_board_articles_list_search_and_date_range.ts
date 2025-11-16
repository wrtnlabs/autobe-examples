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

/**
 * Test combined text search and createdAt date range filtering for article
 * listing.
 *
 * Business scenario:
 *
 * - An admin user defines a single article category for economic/political
 *   topics.
 * - A member user publishes multiple articles, some containing a distinctive
 *   keyword (e.g. "inflation") and others without it.
 * - The global listing endpoint PATCH /discussionBoard/articles is used to
 *   retrieve articles filtered by a text search term and a createdAt date
 *   range.
 *
 * Validation goals:
 *
 * 1. Only articles whose text matches the search term are returned.
 * 2. Among matching articles, only those whose createdAt is within the
 *    [createdFrom, createdTo] range are included.
 * 3. Articles outside the date range or without the keyword are excluded.
 * 4. Pagination metadata (records, pages, current, limit) is consistent with the
 *    controlled test dataset.
 * 5. An invalid date range (createdFrom > createdTo) is treated as returning an
 *    empty result set.
 */
export async function test_api_discussion_board_articles_list_search_and_date_range(
  connection: api.IConnection,
) {
  // 1. Prepare admin user via join
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "Admin#" + RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.discussion-board.test/join",
    referrer: "https://admin.discussion-board.test/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create single article category as admin
  const categoryCreateBody = {
    code: "ECONOMY_" + RandomGenerator.alphaNumeric(6),
    name: "Economy",
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  // 3. Prepare member user via join
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "Member#" + RandomGenerator.alphaNumeric(10),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://discussion-board.test/join",
    referrer: "https://discussion-board.test/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create multiple articles with and without the keyword
  const keyword = "inflation";

  const createArticle = async (title: string, body: string) => {
    const createBody = {
      title,
      body,
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
    return article;
  };

  const keywordArticles: IDiscussionBoardArticle[] = [];
  const nonKeywordArticles: IDiscussionBoardArticle[] = [];

  keywordArticles.push(
    await createArticle(
      `${RandomGenerator.paragraph({ sentences: 1 })} ${keyword} early`,
      `${keyword} impact on economy: ` +
        RandomGenerator.content({ paragraphs: 2 }),
    ),
  );

  nonKeywordArticles.push(
    await createArticle(
      "General market news",
      RandomGenerator.content({ paragraphs: 2 }),
    ),
  );

  keywordArticles.push(
    await createArticle(
      `Debate about ${keyword} policy`,
      RandomGenerator.content({ paragraphs: 3 }) + ` ${keyword} `,
    ),
  );

  nonKeywordArticles.push(
    await createArticle(
      "Local community updates",
      RandomGenerator.content({ paragraphs: 1 }),
    ),
  );

  keywordArticles.push(
    await createArticle(
      `${keyword} expectations in future markets`,
      RandomGenerator.content({ paragraphs: 2 }),
    ),
  );

  // Sort keyword articles by createdAt to derive boundaries
  const sortedKeywordArticles = [...keywordArticles].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const earliestKeyword = sortedKeywordArticles[0];
  const middleKeyword = sortedKeywordArticles[1];
  const latestKeyword = sortedKeywordArticles[2];

  const createdFrom = earliestKeyword.createdAt;
  const createdTo = latestKeyword.createdAt;

  // 5. Call PATCH /discussionBoard/articles with search + date range
  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: keyword,
    categoryId: category.id,
    createdFrom,
    createdTo,
    moderationState: undefined,
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const pageResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: listRequestBody,
    });
  typia.assert(pageResult);

  const page = pageResult.pagination;
  const items = pageResult.data;

  TestValidator.predicate(
    "pagination current is non-negative",
    page.current >= 0,
  );
  TestValidator.predicate("pagination limit is positive", page.limit > 0);
  TestValidator.predicate("records count is non-negative", page.records >= 0);
  TestValidator.predicate("pages count is non-negative", page.pages >= 0);

  TestValidator.equals(
    "records equals returned item count in controlled test",
    items.length,
    page.records,
  );

  for (const article of items) {
    const createdTime = new Date(article.createdAt).getTime();
    const fromTime = new Date(createdFrom).getTime();
    const toTime = new Date(createdTo).getTime();

    TestValidator.predicate(
      "article createdAt within requested range",
      createdTime >= fromTime && createdTime <= toTime,
    );

    const textPool = `${article.title} ${article.excerpt ?? ""}`.toLowerCase();
    TestValidator.predicate(
      "article text contains keyword",
      textPool.includes(keyword.toLowerCase()),
    );
  }

  // Narrowed range around the middle keyword article
  const narrowedFrom = middleKeyword.createdAt;
  const narrowedTo = middleKeyword.createdAt;

  const narrowedRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: keyword,
    categoryId: category.id,
    createdFrom: narrowedFrom,
    createdTo: narrowedTo,
    moderationState: undefined,
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const narrowedResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: narrowedRequestBody,
    });
  typia.assert(narrowedResult);

  for (const article of narrowedResult.data) {
    TestValidator.equals(
      "narrowed range article createdAt matches middle keyword createdAt",
      article.createdAt,
      middleKeyword.createdAt,
    );
  }

  // 6. Invalid date range scenario: createdFrom after createdTo
  const invalidRangeRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: keyword,
    categoryId: category.id,
    createdFrom: createdTo,
    createdTo: createdFrom,
    moderationState: undefined,
    orderBy: "createdAt",
    orderDirection: "asc",
  } satisfies IDiscussionBoardArticle.IRequest;

  const invalidResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: invalidRangeRequestBody,
    });
  typia.assert(invalidResult);

  TestValidator.equals(
    "invalid range returns no data (treated as empty result)",
    invalidResult.data.length,
    0,
  );
}
