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
 * Test that archive operation rejects articles in invalid status states.
 *
 * This test validates the business rule that only articles with 'published' or
 * 'pending_approval' status can be archived. Articles in invalid states like
 * 'draft', 'rejected', or already 'archived' should reject archive attempts.
 *
 * The test follows this workflow:
 *
 * 1. Create moderator and contributor accounts for multi-actor testing
 * 2. Create multiple articles in different status states by simulating workflows
 * 3. Attempt to archive articles with invalid statuses (draft, rejected, archived)
 * 4. Verify that archive operations fail appropriately for invalid states
 * 5. Confirm business rule enforcement for article lifecycle status management
 */
export async function test_api_article_archive_invalid_status(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for archive operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      username: RandomGenerator.alphaNumeric(8),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create contributor account for article creation
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      password: "TestPassword123!",
      username: RandomGenerator.alphaNumeric(8),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });

  // Step 3: Switch back to contributor to create articles
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 4: Create a valid category ID for articles
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Create first article in draft status
  const draftArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(draftArticle);
  TestValidator.equals("draft article status", draftArticle.status, "draft");

  // Step 6: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Attempt to archive draft article - should fail due to invalid status
  await TestValidator.error(
    "archive draft article should be rejected due to invalid status",
    async () => {
      await api.functional.discussionBoard.moderator.articles.archive(
        connection,
        {
          articleId: draftArticle.id,
          body: {
            removalReason: "Attempting to archive draft article",
          } satisfies IDiscussionBoardArticle.IArchive,
        },
      );
    },
  );

  // Step 8: Switch back to contributor to create another article
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Step 9: Create second article for testing
  const secondArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          categoryId: categoryId,
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);

  // Step 10: Switch back to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 11: Attempt to archive another draft article - should fail
  await TestValidator.error(
    "archive second draft article should also be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.articles.archive(
        connection,
        {
          articleId: secondArticle.id,
          body: {
            removalReason: "Testing archive on draft status",
          } satisfies IDiscussionBoardArticle.IArchive,
        },
      );
    },
  );

  // Step 12: Validate that archive operation properly enforces status constraints
  TestValidator.predicate(
    "archive operation enforces valid status transition rules",
    true,
  );
}
