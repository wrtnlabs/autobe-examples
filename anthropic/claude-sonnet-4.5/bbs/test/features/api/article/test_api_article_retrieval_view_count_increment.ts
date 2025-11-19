import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that view_count increments correctly each time an article is retrieved,
 * tracking engagement metrics accurately.
 *
 * This test validates the view count tracking system for discussion board
 * articles. The view_count field is a critical engagement metric that must
 * increment by exactly 1 on each article retrieval operation. This test ensures
 * the counter behaves correctly, persists across multiple operations, and never
 * decrements.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category (required for articles)
 * 3. Create member account and authenticate
 * 4. Create and publish a test article
 * 5. Retrieve the article and record initial view_count
 * 6. Retrieve the same article multiple times (5 times)
 * 7. Validate view_count increments by exactly 1 on each retrieval
 * 8. Verify view_count persistence across multiple operations
 * 9. Confirm engagement tracking accuracy for analytics
 */
export async function test_api_article_retrieval_view_count_increment(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/moderator/join",
      referrer: "https://test.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for view count testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://test.example.com/member/join",
      referrer: "https://test.example.com/",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create and publish a test article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Retrieve the article and record initial view_count
  const firstRetrieval = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(firstRetrieval);

  const initialViewCount = firstRetrieval.view_count;
  TestValidator.predicate(
    "initial view_count should be non-negative",
    initialViewCount >= 0,
  );

  // Step 6-7: Retrieve the article multiple times and validate increment behavior
  let previousViewCount = initialViewCount;

  for (let i = 0; i < 5; i++) {
    const retrieval = await api.functional.discussionBoard.articles.at(
      connection,
      {
        articleId: article.id,
      },
    );
    typia.assert(retrieval);

    const currentViewCount = retrieval.view_count;

    // Validate view_count increments by exactly 1
    TestValidator.equals(
      `view_count should increment by 1 on retrieval ${i + 1}`,
      currentViewCount,
      previousViewCount + 1,
    );

    // Validate view_count never decrements
    TestValidator.predicate(
      `view_count should never decrement (iteration ${i + 1})`,
      currentViewCount > previousViewCount,
    );

    previousViewCount = currentViewCount;
  }

  // Step 8: Verify view_count persistence - final retrieval
  const finalRetrieval = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(finalRetrieval);

  // Total retrievals: 1 initial + 5 in loop + 1 final = 7 retrievals
  // Expected final view_count = initialViewCount + 7
  const expectedFinalCount = initialViewCount + 7;
  TestValidator.equals(
    "final view_count should reflect all retrievals",
    finalRetrieval.view_count,
    expectedFinalCount,
  );

  // Step 9: Confirm engagement tracking accuracy
  TestValidator.predicate(
    "view_count accurately tracks engagement across all operations",
    finalRetrieval.view_count === expectedFinalCount,
  );
}
