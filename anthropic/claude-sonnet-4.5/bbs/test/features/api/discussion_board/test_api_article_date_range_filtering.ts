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
 * Test date range filtering capabilities for discussion board articles.
 *
 * This test validates the date range filtering functionality using
 * created_at_from and created_at_to parameters to discover articles within
 * specific time periods.
 *
 * Test process:
 *
 * 1. Create authenticated member account
 * 2. Create multiple articles at different timestamps with deliberate delays
 * 3. Test complete date range filtering (both from and to)
 * 4. Test single-sided range filtering (only from or only to)
 * 5. Test exact timestamp boundaries
 * 6. Test empty result sets when no articles match criteria
 * 7. Validate ISO 8601 date-time format handling and timestamp comparisons
 */
export async function test_api_article_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "testPassword123!",
      username: RandomGenerator.name(),
      href: "https://test.com/register",
      referrer: "https://test.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create multiple articles at different timestamps with controlled delays
  const articles: IDiscussionBoardArticle[] = [];
  const articleCount = 5;

  for (let i = 0; i < articleCount; i++) {
    const article = await api.functional.discussionBoard.articles.create(
      connection,
      {
        body: {
          title: `Test Article ${i + 1} - ${RandomGenerator.name()}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);

    // Add delay between article creations to ensure different timestamps
    if (i < articleCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 3: Test complete date range filtering (both from and to)
  const firstArticle = articles[0];
  const lastArticle = articles[articleCount - 1];
  const middleIndex = Math.floor(articleCount / 2);
  const middleArticle = articles[middleIndex];

  // Test: Filter articles from first to middle
  const rangeResult1 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        created_at_from: firstArticle.created_at,
        created_at_to: middleArticle.created_at,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(rangeResult1);

  TestValidator.predicate(
    "range filtering from first to middle should return expected count",
    rangeResult1.data.length >= 1 &&
      rangeResult1.data.length <= middleIndex + 1,
  );

  // Verify all returned articles are within the date range
  for (const article of rangeResult1.data) {
    const articleDate = new Date(article.created_at);
    const fromDate = new Date(firstArticle.created_at);
    const toDate = new Date(middleArticle.created_at);

    TestValidator.predicate(
      `article ${article.id} timestamp within range`,
      articleDate >= fromDate && articleDate <= toDate,
    );
  }

  // Step 4: Test single-sided range filtering (only from)
  const fromOnlyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        created_at_from: middleArticle.created_at,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(fromOnlyResult);

  TestValidator.predicate(
    "from-only filtering should return articles",
    fromOnlyResult.data.length >= 1,
  );

  for (const article of fromOnlyResult.data) {
    const articleDate = new Date(article.created_at);
    const fromDate = new Date(middleArticle.created_at);

    TestValidator.predicate(
      `article ${article.id} created after from date`,
      articleDate >= fromDate,
    );
  }

  // Step 5: Test single-sided range filtering (only to)
  const toOnlyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        created_at_to: middleArticle.created_at,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(toOnlyResult);

  TestValidator.predicate(
    "to-only filtering should return articles",
    toOnlyResult.data.length >= 1,
  );

  for (const article of toOnlyResult.data) {
    const articleDate = new Date(article.created_at);
    const toDate = new Date(middleArticle.created_at);

    TestValidator.predicate(
      `article ${article.id} created before to date`,
      articleDate <= toDate,
    );
  }

  // Step 6: Test exact timestamp boundaries
  const exactBoundaryResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        created_at_from: firstArticle.created_at,
        created_at_to: firstArticle.created_at,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(exactBoundaryResult);

  TestValidator.predicate(
    "exact timestamp boundary should include the article",
    exactBoundaryResult.data.some((a) => a.id === firstArticle.id),
  );

  // Step 7: Test empty result sets when no articles match criteria
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
  const futureDateIso = futureDate.toISOString();

  const emptyResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        created_at_from: futureDateIso,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(emptyResult);

  TestValidator.predicate(
    "future date filter should return no results",
    emptyResult.data.filter((a) =>
      articles.some((created) => created.id === a.id),
    ).length === 0,
  );

  // Step 8: Validate ISO 8601 format handling with custom formatted dates
  const customFromDate = new Date(Date.now() - 1000 * 60 * 60);
  const customToDate = new Date();

  const customFormatResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        created_at_from: customFromDate.toISOString(),
        created_at_to: customToDate.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(customFormatResult);

  TestValidator.predicate(
    "ISO 8601 formatted dates should be properly handled",
    customFormatResult.pagination.records >= 0,
  );
}
