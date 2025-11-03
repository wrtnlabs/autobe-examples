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
 * Test the complete report dismissal workflow where a moderator reviews a
 * report and determines no violation occurred.
 *
 * This test validates the proper handling of false-positive reports where
 * content is flagged but determined to be compliant with community guidelines.
 * The workflow demonstrates moderator accountability and transparent
 * decision-making.
 *
 * Workflow:
 *
 * 1. Create moderator account via join (new user context)
 * 2. Create member account via join (new user context)
 * 3. Create category for article
 * 4. Member creates an article
 * 5. Member reports the article
 * 6. Moderator updates report status to 'under_review'
 * 7. Moderator updates report status to 'dismissed' with explanation
 *
 * Validations:
 *
 * - Report transitions properly through status workflow
 * - Moderator assignment is tracked correctly
 * - Dismissal notes are recorded
 * - Reported content remains unchanged and visible
 * - Timestamp updates reflect the status changes
 */
export async function test_api_report_dismissal_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account (SDK automatically switches auth token)
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create category (switch back to moderator authentication)
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 10,
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

  // Step 4: Member creates article (switch to member authentication)
  await api.functional.auth.member.join(connection, {
    body: memberData,
  });

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({
      sentences: 5,
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

  // Step 5: Member reports the article
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
  const reportReason = RandomGenerator.pick(reportReasons);

  const reportData = {
    reported_article_id: article.id,
    reported_comment_id: null,
    report_reason: reportReason,
    report_details: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Validate initial report state
  TestValidator.equals("report initially pending", report.status, "pending");
  TestValidator.equals(
    "report targets article",
    report.reported_article_id,
    article.id,
  );
  TestValidator.equals(
    "report comment is null",
    report.reported_comment_id,
    null,
  );

  // Step 6: Moderator updates report to 'under_review' (switch to moderator authentication)
  await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });

  const underReviewUpdate = {
    reviewing_moderator_id: moderator.id,
    status: "under_review" as const,
    resolution_notes: null,
  } satisfies IDiscussionBoardReport.IUpdate;

  const underReviewReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: underReviewUpdate,
    });
  typia.assert(underReviewReport);

  // Validate under_review state
  TestValidator.equals(
    "report status is under_review",
    underReviewReport.status,
    "under_review",
  );
  TestValidator.equals(
    "moderator assigned",
    underReviewReport.reviewing_moderator_id,
    moderator.id,
  );

  // Step 7: Moderator dismisses the report with explanation
  const dismissalUpdate = {
    status: "dismissed" as const,
    resolution_notes:
      "After careful review, this content does not violate our community guidelines. The reported content is within acceptable standards for political and economic discussion.",
  } satisfies IDiscussionBoardReport.IUpdate;

  const dismissedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: dismissalUpdate,
    });
  typia.assert(dismissedReport);

  // Final validations
  TestValidator.equals(
    "report status is dismissed",
    dismissedReport.status,
    "dismissed",
  );
  TestValidator.equals(
    "moderator still assigned",
    dismissedReport.reviewing_moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "resolution notes recorded",
    dismissedReport.resolution_notes !== null &&
      dismissedReport.resolution_notes.length > 0,
  );
  TestValidator.equals(
    "reported article ID unchanged",
    dismissedReport.reported_article_id,
    article.id,
  );
  TestValidator.predicate(
    "updated timestamp changed",
    new Date(dismissedReport.updated_at).getTime() >
      new Date(report.created_at).getTime(),
  );
}
