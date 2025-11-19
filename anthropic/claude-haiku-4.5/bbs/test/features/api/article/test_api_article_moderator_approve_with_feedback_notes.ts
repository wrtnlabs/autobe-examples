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
 * Test that a moderator can approve an article with constructive feedback
 * notes.
 *
 * This test validates the complete workflow:
 *
 * 1. Create a contributor account and article draft
 * 2. Submit article for moderation (pending_approval status)
 * 3. Create a moderator account
 * 4. Moderator approves article with approval_notes (constructive feedback)
 * 5. Verify approval_notes are stored and visible
 * 6. Verify article is published with moderator attribution
 * 7. Verify contributor can see the approval feedback
 */
export async function test_api_article_moderator_approve_with_feedback_notes(
  connection: api.IConnection,
) {
  // Step 1: Create a contributor account
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: contributorEmail,
      username: RandomGenerator.alphabets(10),
      password: "TestPassword123!",
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor email matches",
    contributor.email,
    contributorEmail,
  );

  // Step 2: Create an article as draft with valid category
  // Using a deterministic UUID for category to avoid random invalid references
  const categoryId = "550e8400-e29b-41d4-a716-446655440000";
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: articleTitle,
          content: articleContent,
          categoryId: categoryId,
          href: "http://localhost:3000/articles/create",
          referrer: "http://localhost:3000/articles",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article initial status is draft",
    article.status,
    "draft",
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );

  // Step 3: Transition article to pending_approval status
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
  TestValidator.equals(
    "article transitioned to pending_approval",
    pendingArticle.status,
    "pending_approval",
  );

  // Step 4: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(10),
      password: "ModeratorPass123!",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    moderatorEmail,
  );

  // Step 5: Moderator logs in and approves article with feedback
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Create approval feedback within the 1000 character constraint
  const approvalFeedback =
    "Excellent article with comprehensive economic analysis. Your research is well-documented and the arguments are clearly presented. For future submissions, consider incorporating more recent statistical data and international perspectives to strengthen comparative analysis.";

  TestValidator.predicate(
    "approval_notes within maximum length",
    approvalFeedback.length <= 1000,
  );

  const approvedArticle =
    await api.functional.discussionBoard.moderator.articles.updateByModerator(
      connection,
      {
        articleId: article.id,
        body: {
          status: "published",
          approval_notes: approvalFeedback,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(approvedArticle);

  // Step 6: Verify approval_notes are stored correctly
  TestValidator.equals(
    "approval_notes stored in published article",
    approvedArticle.approval_notes,
    approvalFeedback,
  );
  TestValidator.equals(
    "article status transitioned to published",
    approvedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at timestamp is set after approval",
    approvedArticle.published_at !== null &&
      approvedArticle.published_at !== undefined,
  );

  // Step 7: Verify approving moderator is attributed
  TestValidator.predicate(
    "approvedByModerator is recorded with moderator info",
    approvedArticle.approvedByModerator !== null &&
      approvedArticle.approvedByModerator !== undefined,
  );
  if (approvedArticle.approvedByModerator) {
    TestValidator.equals(
      "approvedByModerator username matches approver",
      approvedArticle.approvedByModerator.username,
      moderator.username,
    );
  }

  // Step 8: Verify contributor can see approval feedback
  await api.functional.auth.contributor.login(connection, {
    body: {
      email: contributorEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/contributor/login",
      referrer: "http://localhost:3000/contributor",
    } satisfies IDiscussionBoardContributor.ILogin,
  });

  // Verify article core content unchanged
  TestValidator.equals(
    "article title unchanged after approval",
    approvedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content unchanged after approval",
    approvedArticle.content,
    articleContent,
  );

  // Verify approval workflow completed successfully
  TestValidator.equals(
    "article author matches original contributor",
    approvedArticle.author.username,
    contributor.username,
  );
}
