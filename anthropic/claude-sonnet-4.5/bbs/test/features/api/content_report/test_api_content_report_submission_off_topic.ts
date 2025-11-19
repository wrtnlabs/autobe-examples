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
 * Test member reporting an article for being off-topic relative to its assigned
 * category.
 *
 * This test validates the complete workflow of content moderation through
 * community reporting. It creates the necessary infrastructure (moderator,
 * category), establishes two member accounts (one author, one reporter),
 * publishes an article in a category where its content doesn't belong, and then
 * validates that a member can successfully report it as off-topic with proper
 * explanation.
 *
 * Workflow:
 *
 * 1. Create moderator account for category management
 * 2. Create article category (Economic Discussion)
 * 3. Create author member who will write the article
 * 4. Create reporter member who will flag the content
 * 5. Author publishes article in wrong category
 * 6. Reporter submits off-topic violation report
 * 7. Validate report is properly recorded with all details
 */
export async function test_api_content_report_submission_off_topic(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to establish article categories
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureMod123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    ip: "192.168.1.100",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create article category for classification
  const categoryData = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description:
      "Discussions about economic policies, markets, fiscal matters, and financial systems",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create author member who will write the article
  const authorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AuthorPass123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "192.168.1.101",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: authorData,
    });
  typia.assert(author);

  // Step 4: Author creates article in Economic category but with political content (off-topic)
  const articleData = {
    title: "Recent Election Results and Campaign Strategies Analysis",
    body:
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 15,
        sentenceMax: 25,
        wordMin: 5,
        wordMax: 10,
      }) +
      " This article discusses political campaigns, election results, voting patterns, and political party strategies, which belongs in Political Discussion category, not Economic Discussion.",
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Create reporter member who will flag the content
  const reporterData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ReporterPass123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "192.168.1.102",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const reporter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: reporterData,
    });
  typia.assert(reporter);

  // Step 6: Reporter submits off-topic violation report
  const reportData = {
    discussion_board_article_id: article.id,
    report_category: "Off-Topic" as const,
    report_details:
      "This article is categorized under 'Economic Discussion' but the content is entirely about election results, campaign strategies, and political party analysis. This content clearly belongs in the 'Political Discussion' category instead. The article does not discuss economic policies, markets, or fiscal matters as expected for the Economic Discussion category.",
  } satisfies IDiscussionBoardContentReport.ICreate;

  const report: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: reportData,
      },
    );
  typia.assert(report);

  // Step 7: Validate report details
  TestValidator.equals(
    "report category is Off-Topic",
    report.report_category,
    "Off-Topic",
  );
  TestValidator.equals(
    "report is associated with correct article",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report is associated with reporter member",
    report.discussion_board_member_id,
    reporter.id,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.predicate(
    "report details explain category mismatch",
    report.report_details !== null &&
      report.report_details !== undefined &&
      report.report_details.includes("Economic Discussion") &&
      report.report_details.includes("Political"),
  );
  TestValidator.equals(
    "report has no moderator resolution yet",
    report.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "report has no resolution notes yet",
    report.resolution_notes,
    null,
  );
  TestValidator.equals(
    "report has no resolution timestamp yet",
    report.resolved_at,
    null,
  );
}
