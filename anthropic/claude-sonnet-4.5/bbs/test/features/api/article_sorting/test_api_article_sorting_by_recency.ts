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
 * Test sorting articles by creation date (created_at) to discover newest or
 * oldest content.
 *
 * This test validates the article sorting functionality by creating multiple
 * articles over time and verifying that the search API correctly orders them
 * chronologically.
 *
 * Test workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create multiple articles with time gaps to ensure distinct timestamps
 * 3. Search with sort_by='created_at' and sort_order='desc' (newest first)
 * 4. Verify descending chronological order
 * 5. Search with sort_by='created_at' and sort_order='asc' (oldest first)
 * 6. Verify ascending chronological order
 * 7. Validate pagination maintains sort order consistency
 * 8. Confirm timestamps are accurately reflected in article summaries
 */
export async function test_api_article_sorting_by_recency(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create multiple articles with deliberate time gaps
  const articleCount = 7;
  const createdArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < articleCount; i++) {
    const articleData = {
      title: `Test Article ${i + 1} - ${RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 })}`,
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 15,
        wordMin: 4,
        wordMax: 8,
      }),
    } satisfies IDiscussionBoardArticle.ICreate;

    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.articles.create(connection, {
        body: articleData,
      });
    typia.assert(article);
    createdArticles.push(article);

    // Add small delay to ensure distinct timestamps (50ms between articles)
    if (i < articleCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  // Step 3: Test descending order (newest first) - typical use case
  const descendingResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(descendingResult);

  // Step 4: Verify descending chronological order
  TestValidator.predicate(
    "descending result should contain articles",
    descendingResult.data.length > 0,
  );

  // Validate that created_at timestamps are in descending order (newest → oldest)
  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const currentDate = new Date(descendingResult.data[i].created_at);
    const nextDate = new Date(descendingResult.data[i + 1].created_at);

    TestValidator.predicate(
      `article at index ${i} should have created_at >= article at index ${i + 1} in descending order`,
      currentDate.getTime() >= nextDate.getTime(),
    );
  }

  // Step 5: Test ascending order (oldest first)
  const ascendingResult: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 6: Verify ascending chronological order
  TestValidator.predicate(
    "ascending result should contain articles",
    ascendingResult.data.length > 0,
  );

  // Validate that created_at timestamps are in ascending order (oldest → newest)
  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const currentDate = new Date(ascendingResult.data[i].created_at);
    const nextDate = new Date(ascendingResult.data[i + 1].created_at);

    TestValidator.predicate(
      `article at index ${i} should have created_at <= article at index ${i + 1} in ascending order`,
      currentDate.getTime() <= nextDate.getTime(),
    );
  }

  // Step 7: Validate pagination maintains sort order consistency
  if (descendingResult.pagination.pages > 1) {
    const secondPageResult: IPageIDiscussionBoardArticle.ISummary =
      await api.functional.discussionBoard.articles.index(connection, {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          page: 2,
          limit: descendingResult.pagination.limit,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(secondPageResult);

    // Last item of page 1 should have created_at >= first item of page 2
    if (descendingResult.data.length > 0 && secondPageResult.data.length > 0) {
      const lastItemPage1 = new Date(
        descendingResult.data[descendingResult.data.length - 1].created_at,
      );
      const firstItemPage2 = new Date(secondPageResult.data[0].created_at);

      TestValidator.predicate(
        "pagination should maintain descending sort order across pages",
        lastItemPage1.getTime() >= firstItemPage2.getTime(),
      );
    }
  }

  // Step 8: Verify our created articles appear in the results with accurate timestamps
  const ourArticleIds = createdArticles.map((a) => a.id);
  const foundArticlesDesc = descendingResult.data.filter((a) =>
    ourArticleIds.includes(a.id),
  );

  TestValidator.predicate(
    "should find our created articles in descending results",
    foundArticlesDesc.length > 0,
  );

  // Verify timestamps match between creation and retrieval
  for (const foundArticle of foundArticlesDesc) {
    const originalArticle = createdArticles.find(
      (a) => a.id === foundArticle.id,
    );
    if (originalArticle) {
      TestValidator.equals(
        "created_at timestamp should match between creation and retrieval",
        foundArticle.created_at,
        originalArticle.created_at,
      );
    }
  }
}
