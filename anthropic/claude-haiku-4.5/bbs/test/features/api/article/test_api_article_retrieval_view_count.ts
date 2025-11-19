import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article view_count incrementation on retrieval.
 *
 * This test validates that the view_count field in articles is properly
 * initialized at 0 and increments with each article retrieval. The test creates
 * a contributor account, creates an article draft, then retrieves the article
 * multiple times to verify the view_count increments correctly.
 *
 * Workflow:
 *
 * 1. Create first contributor account and authenticate
 * 2. Create an article draft
 * 3. Retrieve the article multiple times and verify view_count increments
 * 4. Create additional contributors and verify view_count increments across users
 * 5. Validate final view_count matches total number of retrievals
 */
export async function test_api_article_retrieval_view_count(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor account
  const contributor1: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor1);
  TestValidator.predicate(
    "first contributor should be authenticated",
    contributor1.token !== undefined,
  );

  // Step 2: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 12,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/dashboard",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article view_count should start at 0",
    article.view_count,
    0,
  );

  // Step 3: Retrieve article first time
  const retrieval1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(retrieval1);
  TestValidator.equals(
    "view_count should increment to 1 after first retrieval",
    retrieval1.view_count,
    1,
  );

  // Step 4: Retrieve article second time
  const retrieval2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(retrieval2);
  TestValidator.equals(
    "view_count should increment to 2 after second retrieval",
    retrieval2.view_count,
    2,
  );

  // Step 5: Retrieve article third time
  const retrieval3: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(retrieval3);
  TestValidator.equals(
    "view_count should increment to 3 after third retrieval",
    retrieval3.view_count,
    3,
  );

  // Step 6: Create second contributor and retrieve article as different user
  const contributor2: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword456!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/home",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor2);

  // Step 7: Retrieve article as second contributor
  const retrieval4: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(retrieval4);
  TestValidator.equals(
    "view_count should increment to 4 after fourth retrieval by different user",
    retrieval4.view_count,
    4,
  );

  // Step 8: Final verification - retrieve one more time
  const retrieval5: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(retrieval5);
  TestValidator.equals(
    "view_count should increment to 5 after fifth retrieval",
    retrieval5.view_count,
    5,
  );

  // Step 9: Verify view_count is consistent across retrievals
  TestValidator.equals(
    "view_count should remain consistent on subsequent retrieval",
    retrieval5.view_count,
    retrieval4.view_count + 1,
  );
}
