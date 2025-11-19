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
 * Test article approval with constructive moderator feedback notes.
 *
 * Validates the article moderation approval workflow with optional feedback
 * notes. Moderator approves articles while providing constructive feedback to
 * give contributors guidance on why their articles were approved and
 * suggestions for future contributions. Tests various feedback note scenarios
 * including edge cases at the 1,000 character maximum limit. Validates that
 * approval_notes are correctly stored and accessible for visibility to article
 * authors and other moderators.
 */
export async function test_api_article_moderation_approve_with_feedback_notes(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator for approval authority
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account successfully authenticated",
    moderator.id !== null && moderator.id !== undefined,
  );

  // Step 2: Approve article with short constructive feedback notes
  const shortFeedbackNotes =
    "Well-written article with clear examples. Consider adding more recent data sources in future submissions.";
  const approvalWithShortNotes: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          approvalNotes: shortFeedbackNotes,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvalWithShortNotes);
  TestValidator.equals(
    "short approval notes correctly stored in article",
    approvalWithShortNotes.approval_notes,
    shortFeedbackNotes,
  );
  TestValidator.equals(
    "article status transitioned to published after approval",
    approvalWithShortNotes.status,
    "published",
  );
  TestValidator.predicate(
    "moderator identity recorded for approval accountability",
    approvalWithShortNotes.approvedByModerator !== null &&
      approvalWithShortNotes.approvedByModerator !== undefined,
  );

  // Step 3: Approve article with medium-length constructive feedback
  const mediumFeedbackNotes =
    "Excellent analysis of economic trends. Your data presentation is clear and accessible to readers. For next submission, consider addressing counterarguments to strengthen the overall argument and credibility.";
  const approvalWithMediumNotes: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          approvalNotes: mediumFeedbackNotes,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvalWithMediumNotes);
  TestValidator.equals(
    "medium-length approval notes correctly stored",
    approvalWithMediumNotes.approval_notes,
    mediumFeedbackNotes,
  );
  TestValidator.predicate(
    "medium feedback notes within constraints",
    (approvalWithMediumNotes.approval_notes?.length ?? 0) <= 1000,
  );

  // Step 4: Approve article with maximum-length feedback notes (1,000 characters)
  const maxFeedbackNotes =
    "This article demonstrates exceptional research quality and comprehensive coverage of the topic. The writing is clear, well-organized, and engaging for our discussion community. Your use of citations and data sources strengthens the credibility of your analysis. The perspective you provide adds valuable insight to ongoing policy debates. We particularly appreciated the balanced approach to controversial aspects. For future submissions, consider expanding the practical implications section to show real-world applications. Include more recent studies published in the last six months. Engage with alternative viewpoints more explicitly in your arguments. These suggestions will further elevate the quality of your contributions. Thank you for sharing this excellent work with our community. Continue developing your expertise in this field.";
  const truncatedMaxFeedback = maxFeedbackNotes.substring(0, 1000);

  const approvalWithMaxNotes: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          approvalNotes: truncatedMaxFeedback,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvalWithMaxNotes);
  TestValidator.equals(
    "maximum-length approval notes correctly stored at 1,000 character limit",
    approvalWithMaxNotes.approval_notes,
    truncatedMaxFeedback,
  );
  TestValidator.equals(
    "maximum feedback notes length is exactly 1,000 characters",
    approvalWithMaxNotes.approval_notes?.length ?? 0,
    1000,
  );

  // Step 5: Approve article without feedback notes (optional field)
  const approvalWithoutNotes: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvalWithoutNotes);
  TestValidator.equals(
    "article approved successfully without approval notes",
    approvalWithoutNotes.status,
    "published",
  );
  TestValidator.predicate(
    "approval_notes field handles undefined/null when not provided",
    approvalWithoutNotes.approval_notes === null ||
      approvalWithoutNotes.approval_notes === undefined,
  );

  // Step 6: Validate that moderator feedback is visible and accessible
  TestValidator.predicate(
    "approval notes with feedback are visible in approved article",
    approvalWithShortNotes.approval_notes !== null &&
      approvalWithShortNotes.approval_notes !== undefined,
  );

  TestValidator.predicate(
    "approval notes are non-empty for articles with feedback",
    (approvalWithShortNotes.approval_notes?.length ?? 0) > 0,
  );

  // Step 7: Verify published_at timestamp is set after approval
  TestValidator.predicate(
    "published_at timestamp set when article approved",
    approvalWithShortNotes.published_at !== null &&
      approvalWithShortNotes.published_at !== undefined,
  );
}
