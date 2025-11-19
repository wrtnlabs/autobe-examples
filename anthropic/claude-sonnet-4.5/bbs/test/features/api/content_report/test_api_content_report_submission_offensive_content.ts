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
 * Test member reporting workflow for offensive content violations.
 *
 * This test validates the complete content reporting flow where a member flags
 * an article for offensive content. It establishes the necessary infrastructure
 * (moderator account, article category), creates a member account, publishes an
 * article, and submits a content report with detailed explanation.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category management
 * 2. Moderator creates article category
 * 3. Create member account for content creation and reporting
 * 4. Member publishes an article
 * 5. Member submits content report flagging offensive content
 * 6. Validate report structure, category, details, and pending status
 */
export async function test_api_content_report_submission_offensive_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator123!";

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates article category
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General topics for community discussion",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member publishes an article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

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

  // Step 5: Member submits content report for offensive content
  const reportDetails =
    "This article contains offensive language and personal attacks against other community members. Specifically, the content includes derogatory terms and inflammatory statements that violate our community guidelines on respectful discourse.";

  const report: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          report_category: "Offensive Content",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report structure and content
  TestValidator.equals(
    "report article ID matches",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report member ID matches",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report category is Offensive Content",
    report.report_category,
    "Offensive Content",
  );
  TestValidator.equals(
    "report details match",
    report.report_details,
    reportDetails,
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report not yet resolved",
    report.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "resolution notes are null",
    report.resolution_notes,
    null,
  );
  TestValidator.equals("resolved_at is null", report.resolved_at, null);
}
