import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that the view_count field is automatically incremented each time an
 * article is retrieved.
 *
 * This test validates the engagement tracking mechanism by creating an article
 * and retrieving it multiple times to verify that the view_count increases with
 * each retrieval. This ensures the system accurately tracks article popularity
 * and engagement metrics.
 *
 * Test Flow:
 *
 * 1. Create a member account to author the test article
 * 2. Create a category required for article creation
 * 3. Create an article with the member account
 * 4. Retrieve the article multiple times (5 times)
 * 5. Verify that view_count increments correctly after each retrieval
 */
export async function test_api_article_view_count_increment(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for article authorship
  const memberRegistration = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(member);

  // Step 2: Create a category required for article creation
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create an article with the member account
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Verify initial view_count is 0
  TestValidator.equals(
    "initial view_count should be 0",
    createdArticle.view_count,
    0,
  );

  // Step 4-5: Retrieve the article multiple times and verify view_count increments
  const retrievalCount = 5;

  for (let i = 1; i <= retrievalCount; i++) {
    const retrievedArticle: IDiscussionBoardArticle =
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: createdArticle.id,
      });
    typia.assert(retrievedArticle);

    // Verify view_count has incremented correctly
    TestValidator.equals(
      `view_count should be ${i} after ${i} retrieval(s)`,
      retrievedArticle.view_count,
      i,
    );

    // Verify article ID remains the same
    TestValidator.equals(
      "article ID should remain consistent",
      retrievedArticle.id,
      createdArticle.id,
    );
  }
}
