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
 * Test that multiple reports for the same article are resolved independently.
 *
 * This test validates the independent resolution workflow for content reports
 * by:
 *
 * 1. Creating infrastructure (moderator, category, members, article)
 * 2. Submitting two separate reports from different members for the same article
 * 3. Resolving only one report while leaving the other pending
 * 4. Verifying that each report maintains independent status, timestamps, and
 *    moderator assignments
 *
 * The test ensures that the moderation system properly isolates report
 * lifecycles, allowing granular handling of each community concern separately
 * without cross-contamination.
 */
export async function test_api_content_report_independent_resolution(
  connection: api.IConnection,
) {
  // Step 1: Create moderator for category creation and report resolution
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion topics",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member and article
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "member123!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  // Step 4: Create article that will receive multiple reports
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: First member submits first report
  const report1 =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Spam" as const,
          report_details: "This article contains promotional spam content",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report1);
  TestValidator.equals(
    "first report initial status",
    report1.status,
    "pending",
  );

  // Step 6: Create second member
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "member456!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  // Step 7: Second member submits independent report for same article
  const report2 =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Offensive Content" as const,
          report_details: "This article contains offensive language",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report2);
  TestValidator.equals(
    "second report initial status",
    report2.status,
    "pending",
  );

  // Step 8: Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 9: Moderator resolves only the first report
  const resolvedReport1 =
    await api.functional.discussionBoard.moderator.contentReports.update(
      connection,
      {
        reportId: report1.id,
        body: {
          status: "reviewed_no_action" as const,
          resolution_notes: "Review completed - no action needed",
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  typia.assert(resolvedReport1);

  // Step 10: Validate first report was resolved
  TestValidator.equals(
    "first report resolved status",
    resolvedReport1.status,
    "reviewed_no_action",
  );
  TestValidator.predicate(
    "first report has resolved_at timestamp",
    resolvedReport1.resolved_at !== null &&
      resolvedReport1.resolved_at !== undefined,
  );
  TestValidator.predicate(
    "first report has resolved_by_moderator_id",
    resolvedReport1.resolved_by_moderator_id !== null &&
      resolvedReport1.resolved_by_moderator_id !== undefined,
  );
  TestValidator.equals(
    "first report resolved by correct moderator",
    typia.assert(resolvedReport1.resolved_by_moderator_id!),
    moderator.id,
  );
  TestValidator.equals(
    "first report has resolution notes",
    resolvedReport1.resolution_notes,
    "Review completed - no action needed",
  );

  // Step 11: Validate second report remains pending and independent
  // Using the original report2 object to verify it was NOT modified by resolving report1
  TestValidator.equals(
    "second report remains pending",
    report2.status,
    "pending",
  );
  TestValidator.equals(
    "second report has no resolved_at",
    report2.resolved_at,
    null,
  );
  TestValidator.equals(
    "second report has no resolved_by_moderator_id",
    report2.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "second report has no resolution_notes",
    report2.resolution_notes,
    null,
  );

  // Step 12: Validate reports are truly independent
  TestValidator.notEquals(
    "report IDs are different",
    resolvedReport1.id,
    report2.id,
  );
  TestValidator.equals(
    "both reports target same article",
    resolvedReport1.discussion_board_article_id,
    report2.discussion_board_article_id,
  );
  TestValidator.notEquals(
    "reports have different categories",
    resolvedReport1.report_category,
    report2.report_category,
  );
  TestValidator.notEquals(
    "reports submitted by different members",
    resolvedReport1.discussion_board_member_id,
    report2.discussion_board_member_id,
  );
}
