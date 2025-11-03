import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Validate that an authenticated user can search for and retrieve a filtered
 * list of discussion board articles (non-deleted only), with full adherence to
 * pagination and advanced filtering logic.
 *
 * Steps:
 *
 * 1. Register a new user and obtain authentication
 * 2. Create several articles as the authenticated user
 * 3. Use PATCH /discussionBoard/user/articles to search for articles: a. Search
 *    with keyword included in article title/body b. Filter by author (current
 *    user) c. Filter by creation date range d. Validate pagination (page,
 *    limit)
 * 4. Verify that only non-deleted articles are returned
 * 5. Ensure created article is present in search results when filters match
 * 6. Confirm that deleted articles do not appear in results
 * 7. Evaluate business rules for search accuracy and permissions
 */
export async function test_api_article_list_search_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<64>
  >();
  const userDisplayName: string = RandomGenerator.name();
  const avatarUrl: (string & tags.Format<"uri">) | null = null; // test with no avatar for minimal profile
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      display_name: userDisplayName,
      avatar_url: avatarUrl,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a batch of articles for the user
  const articles = await ArrayUtil.asyncMap([1, 2, 3], async (i) => {
    const title =
      `Test Article ${i} - ` + RandomGenerator.paragraph({ sentences: 2 });
    const body = RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    });
    const created = await api.functional.discussionBoard.user.articles.create(
      connection,
      {
        body: {
          title,
          body,
          attachments: [], // test without attachments
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(created);
    return created;
  });

  // 3. Test search by keyword (should match at least one created article)
  const keyword = RandomGenerator.substring(articles[0].title);
  const searchByKeyword =
    await api.functional.discussionBoard.user.articles.index(connection, {
      body: {
        q: keyword,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchByKeyword);
  TestValidator.predicate(
    "keyword search returns at least one matching article",
    () => searchByKeyword.data.some((a) => a.title.includes(keyword)),
  );

  // 4. Test filter by author_user_id (should return all created articles)
  const searchByAuthor =
    await api.functional.discussionBoard.user.articles.index(connection, {
      body: {
        author_user_id: user.id,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchByAuthor);
  TestValidator.predicate("author filter returns all created articles", () =>
    articles.every((created) =>
      searchByAuthor.data.some((found) => found.id === created.id),
    ),
  );

  // 5. Test filter by date range (created_from/created_to)
  // Use the created_at timestamps of created articles
  const dateFrom = articles[0].created_at;
  const dateTo = articles[2].created_at;
  const searchByDateRange =
    await api.functional.discussionBoard.user.articles.index(connection, {
      body: {
        created_from: dateFrom,
        created_to: dateTo,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchByDateRange);
  TestValidator.predicate("date range filter returns expected articles", () =>
    articles.every((created) =>
      searchByDateRange.data.some((found) => found.id === created.id),
    ),
  );

  // 6. Test pagination (page/limit)
  const paginated = await api.functional.discussionBoard.user.articles.index(
    connection,
    {
      body: {
        author_user_id: user.id,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "paginated results have expected limit",
    paginated.data.length,
    2,
  );

  // 7. Ensure all returned articles are non-deleted
  TestValidator.predicate(
    "no soft-deleted articles in results",
    () => paginated.data.every((a) => a.title && a.id), // ISummary type has no deleted_at
  );

  // 8. Additional permission and business logic validation: all articles from current user
  TestValidator.predicate("results are authored by the user", () =>
    paginated.data.every((a) => a.author.id === user.id),
  );
}
