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
 * Test successful pinning of an article by moderator.
 *
 * This test validates the article pinning workflow for content curation:
 *
 * 1. Moderator account creation and authentication
 * 2. Contributor account creation and authentication
 * 3. Article creation in draft status
 * 4. Moderator pinning of the article
 * 5. Verification that article is marked as pinned (is_pinned = true)
 * 6. Validation of pinned article metadata
 *
 * The test ensures moderators can successfully pin articles for featured
 * display in the discussion board.
 */
export async function test_api_article_pin_published_article(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== undefined && moderator.email === moderatorEmail,
  );

  // Step 2: Create and authenticate contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePass123!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        password: contributorPassword,
        username: RandomGenerator.alphabets(10),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.predicate(
    "contributor account created successfully",
    contributor.id !== undefined && contributor.email === contributorEmail,
  );

  // Step 3: Create article as contributor
  // Generate a valid UUID for category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 2, wordMax: 6 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    categoryId: categoryId,
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000/",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      { body: articleData },
    );
  typia.assert(createdArticle);
  TestValidator.equals(
    "article initial status is draft",
    createdArticle.status,
    "draft",
  );
  TestValidator.predicate(
    "article is not pinned initially",
    createdArticle.is_pinned === false,
  );

  // Step 4: Switch to moderator context and pin the article
  const pinnedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.pin(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(pinnedArticle);

  // Step 5: Verify article is pinned
  TestValidator.equals(
    "article is_pinned flag is true after pin operation",
    pinnedArticle.is_pinned,
    true,
  );

  // Step 6: Verify pinned article maintains core properties
  TestValidator.equals(
    "pinned article id unchanged",
    pinnedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "pinned article title unchanged",
    pinnedArticle.title,
    createdArticle.title,
  );
  TestValidator.equals(
    "pinned article content unchanged",
    pinnedArticle.content,
    createdArticle.content,
  );
  TestValidator.predicate(
    "pinned article has valid author",
    pinnedArticle.author !== undefined && pinnedArticle.author.id !== undefined,
  );
  TestValidator.predicate(
    "pinned article has valid category",
    pinnedArticle.category !== undefined &&
      pinnedArticle.category.id !== undefined,
  );
}
