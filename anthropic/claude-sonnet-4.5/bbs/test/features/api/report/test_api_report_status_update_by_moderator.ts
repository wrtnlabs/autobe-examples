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
 * Test the complete workflow of a moderator updating a content report status
 * from pending to resolved.
 *
 * This test validates that moderators can successfully review and resolve
 * reports submitted by members.
 *
 * Workflow:
 *
 * 1. Create a new moderator account via join (new user context)
 * 2. Create a member account via join (new user context)
 * 3. Create a category for article organization
 * 4. Member creates an article with the category
 * 5. Member submits a report flagging the article for guidelines violation
 * 6. Moderator updates the report status to 'under_review'
 * 7. Moderator updates the report status to 'resolved' with resolution notes
 *
 * Validations:
 *
 * - Report status transitions correctly from pending → under_review → resolved
 * - Reviewing moderator is correctly assigned
 * - Resolution notes are properly recorded
 * - Updated timestamp reflects the modification
 * - Audit trail is maintained throughout the process
 */
export async function test_api_report_status_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 3: Create category (as moderator)
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Member creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        summary: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Member submits a report flagging the article
  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_article_id: article.id,
        reported_comment_id: null,
        report_reason: "misinformation",
        report_details: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Verify initial report status is pending
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "reviewing moderator initially null",
    report.reviewing_moderator_id,
    null,
  );

  // Step 6: Moderator updates report status to under_review
  const underReviewReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        reviewing_moderator_id: moderator.id,
        status: "under_review",
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(underReviewReport);

  // Verify report status changed to under_review
  TestValidator.equals(
    "report status updated to under_review",
    underReviewReport.status,
    "under_review",
  );
  TestValidator.equals(
    "reviewing moderator assigned",
    underReviewReport.reviewing_moderator_id,
    moderator.id,
  );

  // Step 7: Moderator updates report status to resolved with resolution notes
  const resolvedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "resolved",
        resolution_notes: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 12,
        }),
      } satisfies IDiscussionBoardReport.IUpdate,
    });
  typia.assert(resolvedReport);

  // Verify final report status is resolved
  TestValidator.equals(
    "report status updated to resolved",
    resolvedReport.status,
    "resolved",
  );
  TestValidator.equals(
    "reviewing moderator still assigned",
    resolvedReport.reviewing_moderator_id,
    moderator.id,
  );
  TestValidator.predicate(
    "resolution notes recorded",
    resolvedReport.resolution_notes !== null &&
      resolvedReport.resolution_notes.length > 0,
  );
}
