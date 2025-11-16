import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test sorting articles by last modification time to identify recently edited
 * content.
 *
 * This test validates that the article search API correctly sorts results by
 * the updated_at timestamp in descending order. The test creates multiple
 * articles, updates some of them to create distinct updated_at values, then
 * verifies that the search API returns them in the correct chronological order
 * with the most recently updated articles appearing first.
 *
 * Test workflow:
 *
 * 1. Register a member account for authentication
 * 2. Create 5 initial articles (all with similar timestamps)
 * 3. Update 3 articles in sequence to create distinct updated_at values
 * 4. Query the search API with sort_by='updated_at' and sort_order='desc'
 * 5. Validate that articles are returned in correct order (most recently updated
 *    first)
 */
export async function test_api_article_sorting_by_recent_updates(
  connection: api.IConnection,
) {
  // Step 1: Register member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create 5 initial articles
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const articleData = {
        title: `Test Article ${index + 1} - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate;

      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.articles.create(connection, {
          body: articleData,
        });
      typia.assert(article);
      return article;
    },
  );

  // Step 3: Wait briefly to ensure timestamp differences, then update 3 articles
  // Update articles in a specific order: articles[1], articles[3], articles[0]
  await new Promise((resolve) => setTimeout(resolve, 100));

  const updateData1 = {
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: articles[1].id,
      body: updateData1,
    });
  typia.assert(updatedArticle1);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const updateData2 = {
    title: `Updated Article - ${RandomGenerator.paragraph({ sentences: 2 })}`,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: articles[3].id,
      body: updateData2,
    });
  typia.assert(updatedArticle2);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const updateData3 = {
    title: `Most Recently Updated - ${RandomGenerator.paragraph({ sentences: 2 })}`,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: articles[0].id,
      body: updateData3,
    });
  typia.assert(updatedArticle3);

  // Step 4: Query search API with sort_by='updated_at' and sort_order='desc'
  const searchRequest = {
    sort_by: "updated_at",
    sort_order: "desc",
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardArticle.IRequest;

  const searchResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResult);

  // Step 5: Validate that articles are returned in correct order
  // Expected order: articles[0], articles[3], articles[1], articles[2], articles[4]
  // (most recently updated first)

  TestValidator.predicate(
    "search result should contain articles",
    searchResult.data.length >= 3,
  );

  // Find our test articles in the results
  const ourArticleIds = articles.map((a) => a.id);
  const resultArticles = searchResult.data.filter((article) =>
    ourArticleIds.includes(article.id),
  );

  TestValidator.predicate(
    "should find all created articles in results",
    resultArticles.length === 5,
  );

  // Verify the order: most recently updated should be first
  const article0Index = resultArticles.findIndex(
    (a) => a.id === articles[0].id,
  );
  const article3Index = resultArticles.findIndex(
    (a) => a.id === articles[3].id,
  );
  const article1Index = resultArticles.findIndex(
    (a) => a.id === articles[1].id,
  );

  TestValidator.predicate(
    "most recently updated article (articles[0]) should appear before articles[3]",
    article0Index < article3Index,
  );

  TestValidator.predicate(
    "articles[3] should appear before articles[1]",
    article3Index < article1Index,
  );

  // Verify updated_at timestamps are in descending order for our articles
  for (let i = 0; i < resultArticles.length - 1; i++) {
    const currentUpdatedAt = new Date(resultArticles[i].updated_at).getTime();
    const nextUpdatedAt = new Date(resultArticles[i + 1].updated_at).getTime();

    TestValidator.predicate(
      `article at index ${i} should have updated_at >= article at index ${i + 1}`,
      currentUpdatedAt >= nextUpdatedAt,
    );
  }
}
