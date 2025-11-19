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
 * Test the misinformation reporting workflow where a member flags an article
 * containing factually incorrect claims.
 *
 * This test validates the complete content report submission process:
 *
 * 1. Create moderator account and establish article category
 * 2. Create member account and publish article with misinformation
 * 3. Create second member account to report the article
 * 4. Submit content report with 'Misinformation' category and detailed
 *    fact-checking explanation
 * 5. Validate report captures misinformation category, preserves explanation,
 *    references both members and article
 * 6. Ensure report is queued for moderator review with 'pending' status
 */
export async function test_api_content_report_submission_misinformation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        ip: "192.168.1.1",
        href: "https://example.com/moderator/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and market trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account (article author)
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: authorEmail,
        password: "author123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: "Economic analyst",
        ip: "192.168.1.2",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(authorMember);

  // Step 4: Author creates article with misinformation
  const articleTitle =
    "Global Inflation Rate Hits 500% - Economic Collapse Imminent";
  const articleBody =
    RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 5,
      wordMax: 10,
    }) +
    " The global inflation rate has reached an unprecedented 500% this quarter, signaling imminent economic collapse across all major economies. Experts predict complete financial system failure within days.";

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals("article is published", article.status, "published");

  // Step 5: Create second member account (reporter)
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterJoined: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: reporterEmail,
        password: "reporter123",
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        bio: "Fact checker",
        ip: "192.168.1.3",
        href: "https://example.com/member/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(reporterJoined);

  const reporter: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: reporterEmail,
        password: "reporter123",
        ip: "192.168.1.3",
        href: "https://example.com/member/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(reporter);

  // Step 6: Submit content report for misinformation
  const reportDetails =
    "This article contains factually incorrect claims about global inflation rates. The claim that global inflation has reached 500% is demonstrably false. According to IMF data, current global inflation averages 6.8% in 2023. The article also falsely claims imminent economic collapse, which has no basis in current economic indicators. Major economies show stable growth patterns. This misinformation could cause unnecessary panic and financial decisions based on false premises.";

  const contentReport: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          report_category: "Misinformation",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Step 7: Validate report properties
  TestValidator.equals(
    "report references correct article",
    contentReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report references reporting member",
    contentReport.discussion_board_member_id,
    reporter.id,
  );
  TestValidator.equals(
    "report category is Misinformation",
    contentReport.report_category,
    "Misinformation",
  );
  TestValidator.equals(
    "report details preserved",
    contentReport.report_details,
    reportDetails,
  );
  TestValidator.equals(
    "report status is pending",
    contentReport.status,
    "pending",
  );
  TestValidator.predicate(
    "report not yet resolved by moderator",
    contentReport.resolved_by_moderator_id === null ||
      contentReport.resolved_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "no resolution notes yet",
    contentReport.resolution_notes === null ||
      contentReport.resolution_notes === undefined,
  );
  TestValidator.predicate(
    "no resolution timestamp yet",
    contentReport.resolved_at === null ||
      contentReport.resolved_at === undefined,
  );
  TestValidator.predicate(
    "report has creation timestamp",
    typeof contentReport.created_at === "string",
  );
}
