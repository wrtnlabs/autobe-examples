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
 * Test that a member can successfully check the status of a content report they
 * previously submitted.
 *
 * This test validates the transparency workflow where members can track their
 * submitted reports. The test follows these steps:
 *
 * 1. Create moderator account for category creation
 * 2. Create and authenticate as a member account
 * 3. Create a category for article organization
 * 4. Create an article as the target content
 * 5. Submit a content report on the article
 * 6. Retrieve the report details to check status and resolution
 *
 * Validation points:
 *
 * - Member can access reports they created themselves
 * - Report status is visible (pending, under review, resolved, or dismissed)
 * - Report includes the original reason category and detailed explanation
 *   submitted
 * - Timestamps show when report was created
 * - If resolved, resolution notes from moderators are visible
 */
export async function test_api_member_report_status_check(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create and authenticate as a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Create a category for article organization
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Create an article as the target content
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Submit a content report on the article
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
    reported_article_id: article.id,
    reported_comment_id: null,
    report_reason: selectedReason,
    report_details: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const submittedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(submittedReport);

  // Step 6: Retrieve the report details to check status and resolution
  const retrievedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.reports.at(connection, {
      reportId: submittedReport.id,
    });
  typia.assert(retrievedReport);

  // Validate that member can access their own report
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    submittedReport.id,
  );

  // Validate report status is visible and accurate
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );

  // Validate report includes original reason category
  TestValidator.equals(
    "report reason matches",
    retrievedReport.report_reason,
    selectedReason,
  );

  // Validate report includes detailed explanation
  TestValidator.equals(
    "report details match",
    retrievedReport.report_details,
    reportData.report_details,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );

  // Validate reporter information is accessible
  TestValidator.equals(
    "reporter ID matches member",
    retrievedReport.reporter.id,
    member.id,
  );

  // Validate reported article reference is included
  TestValidator.predicate(
    "reported article exists",
    retrievedReport.reportedArticle !== null,
  );
  if (retrievedReport.reportedArticle) {
    TestValidator.equals(
      "reported article ID matches",
      retrievedReport.reportedArticle.id,
      article.id,
    );
  }
}
