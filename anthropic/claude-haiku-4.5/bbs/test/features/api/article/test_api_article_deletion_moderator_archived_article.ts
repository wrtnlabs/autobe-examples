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
 * Test that moderators can delete archived articles and verify soft deletion.
 *
 * This test validates the complete article lifecycle where:
 *
 * - A contributor creates and publishes an article
 * - A moderator archives the published article
 * - The moderator then permanently deletes the archived article
 * - The article is soft-deleted (marked with deleted_at timestamp, not physically
 *   removed)
 * - The deleted article is no longer accessible through normal listings
 *
 * Steps:
 *
 * 1. Register a new contributor with email and credentials
 * 2. Create a discussion board article in draft status
 * 3. Register a moderator account for content management
 * 4. Archive the article using the moderator's archive operation
 * 5. Verify the article status changed to "archived"
 * 6. Delete the archived article using moderator deletion endpoint
 * 7. Verify the response indicates soft deletion (deleted_at is set)
 * 8. Confirm deletion was successful and article is marked as deleted
 */
export async function test_api_article_deletion_moderator_archived_article(
  connection: api.IConnection,
) {
  // Step 1: Register contributor
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributorPassword = "SecurePassword123!";
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(10),
        password: contributorPassword,
        href: "http://localhost:3000/auth/contributor/join",
        referrer: "http://localhost:3000/",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);

  // Step 2: Create an article in draft status
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 2, wordMax: 5 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    categoryId: categoryId,
    href: "http://localhost:3000/articles/create",
    referrer: "http://localhost:3000/",
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: articleData,
      },
    );
  typia.assert(createdArticle);
  TestValidator.equals(
    "created article has correct title",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "created article is in draft status",
    createdArticle.status,
    "draft",
  );

  // Step 3: Register a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator/login",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 4: Archive the article
  const archiveReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const archivedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.archive(
      connection,
      {
        articleId: createdArticle.id,
        body: {
          removalReason: archiveReason,
        } satisfies IDiscussionBoardArticle.IArchive,
      },
    );
  typia.assert(archivedArticle);
  TestValidator.equals(
    "archived article status is archived",
    archivedArticle.status,
    "archived",
  );

  // Step 5: Delete the archived article
  const deletedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.eraseByModerator(
      connection,
      {
        articleId: createdArticle.id,
      },
    );
  typia.assert(deletedArticle);
  TestValidator.equals(
    "deleted article status is deleted",
    deletedArticle.status,
    "deleted",
  );
  TestValidator.predicate(
    "deleted article has deleted_at timestamp set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Step 6: Verify the article deletion was successful
  TestValidator.equals(
    "deleted article has same ID as original",
    deletedArticle.id,
    createdArticle.id,
  );
  TestValidator.predicate(
    "deleted article is marked for deletion",
    deletedArticle.status === "deleted",
  );
}
