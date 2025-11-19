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
 * Test submitting a content report with 'Other' category for violations that
 * don't fit predefined categories.
 *
 * This test validates the content reporting system's ability to accept reports
 * with the 'Other' category, which is essential for handling unique policy
 * violations that don't clearly fit into standard categories like Spam,
 * Offensive Content, Misinformation, or Off-Topic. The test ensures that when
 * members encounter content that violates community guidelines in non-standard
 * ways, they can report it with a detailed explanation that provides context
 * for moderators.
 *
 * Test Flow:
 *
 * 1. Create moderator account for category management
 * 2. Moderator creates article category
 * 3. Create member account for content creation and reporting
 * 4. Member creates an article with content that has a unique policy violation
 * 5. Member submits report with 'Other' category and detailed explanation
 * 6. Validate report is accepted with 'Other' category and contains detailed
 *    explanation
 */
export async function test_api_content_report_other_category(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussions on economic and political topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for content creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates an article with unique policy violation
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Article with Unique Policy Concern",
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit content report with 'Other' category and detailed explanation
  const reportDetails =
    "This article contains content that promotes a business venture disguised as educational content, which violates our undisclosed advertising policy. While not exactly spam or misinformation, it represents a unique violation of our community guidelines regarding commercial promotion without proper disclosure.";

  const report =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Other",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report creation and properties
  TestValidator.equals(
    "report category is Other",
    report.report_category,
    "Other",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report references correct article",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "report references correct member",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report details match provided explanation",
    report.report_details,
    reportDetails,
  );
  TestValidator.predicate(
    "report has valid UUID",
    typia.is<string & tags.Format<"uuid">>(report.id),
  );
  TestValidator.predicate(
    "created_at is set",
    report.created_at !== null && report.created_at !== undefined,
  );
}
