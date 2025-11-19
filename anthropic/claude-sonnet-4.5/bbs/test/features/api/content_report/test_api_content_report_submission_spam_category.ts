import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete workflow of a member reporting an article for spam
 * violations.
 *
 * This test validates the community-driven content moderation system where
 * members can flag articles that violate community guidelines. The workflow
 * includes:
 *
 * 1. Moderator account creation and category establishment
 * 2. Member account creation and article publication
 * 3. Content report submission with spam category
 * 4. Validation of report structure and pending status
 *
 * The test ensures that reports are properly created with correct references,
 * appropriate status values, and proper timestamp management for the moderation
 * queue.
 */
export async function test_api_content_report_submission_spam_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "192.168.1.100",
      href: "https://discussion-board.example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussion-board.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description:
            "Discussions about economic policies, markets, and fiscal topics",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
      ip: "192.168.1.200",
      href: "https://discussion-board.example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://discussion-board.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create article to be reported
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Analysis of Current Economic Trends and Market Predictions",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit content report flagging the article as spam
  const reportDetails =
    "This article contains repetitive promotional content and appears to be spam. The same marketing message is repeated multiple times without providing genuine economic analysis. It violates our community guidelines on authentic discussion content.";

  const report =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          report_category: "Spam",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report structure and properties
  TestValidator.equals("report has pending status", report.status, "pending");
  TestValidator.equals(
    "report references correct article",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report has correct reporter",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report has spam category",
    report.report_category,
    "Spam",
  );

  // Validate report details if provided
  if (report.report_details !== null && report.report_details !== undefined) {
    TestValidator.equals(
      "report has detailed explanation",
      report.report_details,
      reportDetails,
    );
  }

  // Validate timestamps - created_at is guaranteed by typia.assert, just verify it exists
  TestValidator.predicate(
    "report has valid created timestamp",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  // Validate pending state - no resolution data should exist
  TestValidator.predicate(
    "report has no resolved timestamp",
    report.resolved_at === null || report.resolved_at === undefined,
  );
  TestValidator.predicate(
    "report has no resolver moderator",
    report.resolved_by_moderator_id === null ||
      report.resolved_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "report has no resolution notes",
    report.resolution_notes === null || report.resolution_notes === undefined,
  );
}
