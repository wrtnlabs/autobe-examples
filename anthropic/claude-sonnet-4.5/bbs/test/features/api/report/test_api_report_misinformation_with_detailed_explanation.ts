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
 * Test reporting functionality with misinformation reason and detailed
 * explanation.
 *
 * This test validates the complete reporting workflow where a member reports an
 * article for containing misinformation and provides a comprehensive detailed
 * explanation.
 *
 * The test ensures that:
 *
 * - The optional detailed explanation field accepts and stores comprehensive text
 * - The report is correctly associated with the misinformation reason category
 * - The report is created with pending status
 * - The complete report record including full detailed explanation is returned
 * - All relationships (reporter, reported article) are correctly established
 *
 * Workflow:
 *
 * 1. Create moderator and category for article organization
 * 2. Create member account for content creation and reporting
 * 3. Create article with potentially misleading information
 * 4. Submit misinformation report with comprehensive detailed explanation
 * 5. Validate report creation with all fields correctly populated
 */
export async function test_api_report_misinformation_with_detailed_explanation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category for article organization
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for content creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Create article with potentially misleading information
  const articleTitle = "Economic Analysis with Questionable Claims";
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Submit misinformation report with comprehensive detailed explanation
  const detailedExplanation = RandomGenerator.paragraph({
    sentences: 12,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 490);

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_article_id: article.id,
        reported_comment_id: null,
        report_reason: "misinformation",
        report_details: detailedExplanation,
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Validate report creation with all fields
  TestValidator.equals(
    "report reason is misinformation",
    report.report_reason,
    "misinformation",
  );
  TestValidator.equals(
    "report details contains explanation",
    report.report_details,
    detailedExplanation,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reported article ID matches",
    report.reported_article_id,
    article.id,
  );
  TestValidator.equals(
    "reported comment ID is null",
    report.reported_comment_id,
    null,
  );
  TestValidator.equals(
    "reporter member ID matches",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.predicate(
    "report has creation timestamp",
    report.created_at !== null && report.created_at !== undefined,
  );
  TestValidator.predicate(
    "report has update timestamp",
    report.updated_at !== null && report.updated_at !== undefined,
  );
  TestValidator.predicate(
    "reporter summary exists",
    report.reporter !== null && report.reporter !== undefined,
  );
  TestValidator.predicate(
    "reported article summary exists",
    report.reportedArticle !== null && report.reportedArticle !== undefined,
  );
}
