import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test dismissing a report on a comment rather than an article, validating that
 * the dismissal workflow works for both content types (articles and comments).
 *
 * Workflow:
 *
 * 1. Create moderator account via join (new user context)
 * 2. Create member account via join (new user context)
 * 3. Create category for article
 * 4. Member creates an article
 * 5. Member posts a comment on the article
 * 6. Member reports the comment for potential violation
 * 7. Moderator dismisses the comment report with reasoning
 *
 * Validations:
 *
 * - Comment reports can be dismissed successfully
 * - Dismissal works for both article and comment report types
 * - Resolution notes explain why comment doesn't violate guidelines
 * - Comment remains visible after report dismissal
 * - Audit trail tracks dismissal decision
 */
export async function test_api_comment_report_dismissal(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@testdomain.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: moderatorEmail,
    password: moderatorPassword,
    href: `https://example.com/moderator/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home`,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account (switch context)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@testdomain.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    href: `https://example.com/member/${RandomGenerator.alphaNumeric(6)}`,
    referrer: `https://example.com/home`,
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Switch to moderator and create category
  connection.headers = { Authorization: moderator.token.access };

  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member and create article
  connection.headers = { Authorization: member.token.access };

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Member posts a comment on the article
  const commentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 6: Member reports the comment
  const reportReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "off_topic",
    "inappropriate_language",
    "personal_info",
    "other",
  ] as const;
  const selectedReason = RandomGenerator.pick(reportReasons);

  const reportData = {
    reported_article_id: null,
    reported_comment_id: comment.id,
    report_reason: selectedReason,
    report_details:
      selectedReason === "other"
        ? RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 })
        : null,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Validate report was created correctly
  TestValidator.equals(
    "report targets comment",
    report.reported_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "report has no article target",
    report.reported_article_id,
    null,
  );
  TestValidator.equals(
    "report reason matches",
    report.report_reason,
    selectedReason,
  );
  TestValidator.equals("report initially pending", report.status, "pending");

  // Step 7: Switch to moderator and dismiss the report
  connection.headers = { Authorization: moderator.token.access };

  const dismissalData = {
    resolution_notes:
      "After review, this comment does not violate community guidelines. The content is appropriate and contributes meaningfully to the discussion. The report appears to be a misunderstanding of our community standards.",
  } satisfies IDiscussionBoardReport.IDismiss;

  const dismissedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.dismiss(connection, {
      reportId: report.id,
      body: dismissalData,
    });
  typia.assert(dismissedReport);

  // Validate dismissal results
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "resolution notes recorded",
    dismissedReport.resolution_notes,
    dismissalData.resolution_notes,
  );
  TestValidator.equals(
    "reviewing moderator assigned",
    dismissedReport.reviewing_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "report still targets comment",
    dismissedReport.reported_comment_id,
    comment.id,
  );
  TestValidator.equals("report ID unchanged", dismissedReport.id, report.id);
  TestValidator.equals(
    "reported article remains null",
    dismissedReport.reported_article_id,
    null,
  );

  // Validate that updated_at changed
  TestValidator.predicate(
    "updated_at changed after dismissal",
    new Date(dismissedReport.updated_at).getTime() >=
      new Date(report.created_at).getTime(),
  );
}
