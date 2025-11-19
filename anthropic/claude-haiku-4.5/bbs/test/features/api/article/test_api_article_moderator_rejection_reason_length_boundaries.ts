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
 * Test rejection_reason length validation for moderator article rejection.
 *
 * Validates that the rejection_reason field enforces maximum length constraints
 * (500 characters). Tests boundary conditions with exactly 500 characters, 501
 * characters (exceeds), and 499 characters (within limit).
 *
 * Test flow:
 *
 * 1. Register contributor and create three articles in pending_approval status
 * 2. Register moderator for rejection operations
 * 3. Test rejection with exactly 500 character rejection_reason (should succeed)
 * 4. Test rejection with 501 character rejection_reason (should fail)
 * 5. Test rejection with 499 character rejection_reason (should succeed)
 *
 * This validates that the moderation system properly enforces rejection_reason
 * length boundaries.
 */
export async function test_api_article_moderator_rejection_reason_length_boundaries(
  connection: api.IConnection,
) {
  // 1. Create contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "SecurePassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);

  // Get a random category for article creation
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create three articles in pending_approval status (all as contributor)
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article =
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 3,
              wordMin: 3,
              wordMax: 5,
            }),
            content: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 5,
              sentenceMax: 10,
            }),
            categoryId: categoryId,
            href: "http://localhost:3000/articles/create",
            referrer: "http://localhost:3000/",
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);

    // Transition article to pending_approval
    const pendingArticle =
      await api.functional.discussionBoard.contributor.articles.update(
        connection,
        {
          articleId: article.id,
          body: {
            status: "pending_approval",
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    typia.assert(pendingArticle);
    return pendingArticle;
  });

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Test with exactly 500 character rejection_reason (should succeed)
  const reason500 = "a".repeat(500);
  const rejectedArticle500 =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: articles[0].id,
        body: {
          status: "rejected",
          rejection_reason: reason500,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(rejectedArticle500);
  TestValidator.equals(
    "rejection_reason at max boundary (500 chars) stored correctly",
    rejectedArticle500.rejection_reason,
    reason500,
  );

  // 5. Test with 501 character rejection_reason (should fail)
  const reason501 = "a".repeat(501);
  await TestValidator.error(
    "rejection_reason exceeding 500 characters should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.articles.updateByModerator(
        connection,
        {
          articleId: articles[1].id,
          body: {
            status: "rejected",
            rejection_reason: reason501,
          } satisfies IDiscussionBoardArticle.IUpdate,
        },
      );
    },
  );

  // 6. Test with 499 character rejection_reason (should succeed)
  const reason499 = "b".repeat(499);
  const rejectedArticle499 =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: articles[2].id,
        body: {
          status: "rejected",
          rejection_reason: reason499,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(rejectedArticle499);
  TestValidator.equals(
    "rejection_reason below max boundary (499 chars) stored correctly",
    rejectedArticle499.rejection_reason,
    reason499,
  );
}
