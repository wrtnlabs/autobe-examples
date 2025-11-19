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
 * Test submitting a content report with only required fields, omitting the
 * optional report_details field.
 *
 * This test validates that the content reporting system properly handles
 * minimal data submissions, where only the required fields (article ID and
 * report category) are provided without additional details. The system should
 * accept such reports and create valid pending reports for moderator review,
 * maintaining accountability even without detailed explanations.
 *
 * Test Flow:
 *
 * 1. Create moderator account and set up category infrastructure
 * 2. Create member account for article authorship
 * 3. Create an article to be reported
 * 4. Create second member account (reporter)
 * 5. Submit content report with minimal data (no report_details)
 * 6. Validate report creation and structure
 */
export async function test_api_content_report_minimal_data(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category setup
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const categoryData = {
    name: "General Discussion",
    slug: "general-discussion",
    description: "General topics for discussion",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (article author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorData = {
    email: authorEmail,
    password: "author123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: authorData,
  });

  // Login as author to create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: authorEmail,
      password: "author123!",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 4: Create article to be reported
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 5: Create second member account (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterData = {
    email: reporterEmail,
    password: "reporter123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  await api.functional.auth.member.join(connection, {
    body: reporterData,
  });

  // Login as reporter
  await api.functional.auth.member.login(connection, {
    body: {
      email: reporterEmail,
      password: "reporter123!",
      ip: "127.0.0.1",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Step 6: Submit content report with minimal data (no report_details)
  const categories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const reportCategory = RandomGenerator.pick(categories);

  const minimalReportData = {
    discussion_board_article_id: article.id,
    report_category: reportCategory,
    report_details: null,
  } satisfies IDiscussionBoardContentReport.ICreate;

  const report =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: minimalReportData,
      },
    );
  typia.assert(report);

  // Step 7: Validate report structure and minimal data handling
  TestValidator.equals(
    "report article ID matches",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report category matches",
    report.report_category,
    reportCategory,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals("report details is null", report.report_details, null);
  TestValidator.predicate(
    "report has valid ID",
    typeof report.id === "string" && report.id.length > 0,
  );
  TestValidator.predicate(
    "report created timestamp exists",
    typeof report.created_at === "string",
  );
  TestValidator.equals(
    "resolved_at is null for pending report",
    report.resolved_at,
    null,
  );
  TestValidator.equals(
    "resolved_by_moderator_id is null",
    report.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "resolution_notes is null",
    report.resolution_notes,
    null,
  );
}
