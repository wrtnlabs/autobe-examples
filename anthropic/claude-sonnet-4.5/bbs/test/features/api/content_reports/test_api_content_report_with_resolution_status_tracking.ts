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
 * Test content report retrieval with resolution status tracking.
 *
 * This test validates that the GET endpoint correctly returns content reports
 * with their current resolution status (pending, reviewed_no_action,
 * reviewed_edited, reviewed_removed) along with associated metadata like
 * resolution_notes and resolved_at.
 *
 * The test creates a complete reporting workflow:
 *
 * 1. Set up moderator and member accounts
 * 2. Create article category and article infrastructure
 * 3. Submit a content report as a member
 * 4. Retrieve the report and verify status tracking fields
 *
 * This ensures transparency in the moderation lifecycle for both moderators and
 * reporting members.
 */
export async function test_api_content_report_with_resolution_status_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category (requires moderator authentication)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and markets",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to submit reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create an article to be reported
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Submit content report with pending status
  const reportCategory = RandomGenerator.pick([
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const);
  const reportDetails = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const submittedReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: reportCategory,
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(submittedReport);

  // Step 6: Switch to moderator to retrieve the report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      ip: "127.0.0.1",
      href: "https://example.com/moderator/dashboard",
      referrer: "https://example.com/moderator/login",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Retrieve the report and verify status tracking
  const retrievedReport =
    await api.functional.discussionBoard.moderator.contentReports.at(
      connection,
      {
        reportId: submittedReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Step 8: Verify pending status and null resolution fields
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    submittedReport.id,
  );
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "article ID matches",
    retrievedReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report category matches",
    retrievedReport.report_category,
    reportCategory,
  );

  // Verify resolution fields are null or undefined for pending status
  TestValidator.predicate(
    "resolved_by_moderator_id is null or undefined for pending",
    retrievedReport.resolved_by_moderator_id === null ||
      retrievedReport.resolved_by_moderator_id === undefined,
  );
  TestValidator.predicate(
    "resolution_notes is null or undefined for pending",
    retrievedReport.resolution_notes === null ||
      retrievedReport.resolution_notes === undefined,
  );
  TestValidator.predicate(
    "resolved_at is null or undefined for pending",
    retrievedReport.resolved_at === null ||
      retrievedReport.resolved_at === undefined,
  );

  // Verify created_at timestamp exists
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
}
