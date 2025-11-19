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
 * Test moderator resolving a content report by editing the problematic content.
 *
 * This test validates the complete moderation workflow where a moderator
 * reviews a content report and resolves it by editing the article content to
 * address the reported concerns. The test verifies status transitions,
 * timestamp updates, moderator attribution, and audit trail documentation.
 *
 * Workflow:
 *
 * 1. Create moderator account for category management and report resolution
 * 2. Moderator creates discussion category required for articles
 * 3. Create member account to author articles and submit reports
 * 4. Member creates an article with potentially problematic content
 * 5. Member submits content report flagging the article
 * 6. Moderator reviews and resolves report with 'reviewed_edited' status
 * 7. Validate resolution details, timestamps, and audit trail
 */
export async function test_api_content_report_resolution_edited(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion topics for testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates article with potentially problematic content
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Important Discussion Topic - Contains Problematic Content",
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

  // Step 5: Member submits content report
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const selectedCategory = RandomGenerator.pick(reportCategories);

  const initialReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: selectedCategory,
          report_details:
            "This article contains content that violates community guidelines. The tone is inappropriate and needs editorial review.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Validate initial report state
  TestValidator.equals(
    "initial report status is pending",
    initialReport.status,
    "pending",
  );
  TestValidator.equals(
    "initial report has no moderator assigned",
    initialReport.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "initial report has no resolution timestamp",
    initialReport.resolved_at,
    null,
  );
  TestValidator.equals(
    "initial report has no resolution notes",
    initialReport.resolution_notes,
    null,
  );

  // Step 6: Switch to moderator context for report resolution
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/dashboard",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator resolves report with 'reviewed_edited' status
  const resolutionNotes =
    "Content has been edited to remove inappropriate language and improve tone. Changed sections include paragraph 2 and 3 to align with community guidelines. The core message remains intact but presentation has been improved.";

  const resolvedReport =
    await api.functional.discussionBoard.moderator.contentReports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          status: "reviewed_edited",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Step 8: Validate resolution details
  TestValidator.equals(
    "report status updated to reviewed_edited",
    resolvedReport.status,
    "reviewed_edited",
  );
  TestValidator.equals(
    "resolution notes recorded correctly",
    resolvedReport.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "moderator ID attributed to resolution",
    resolvedReport.resolved_by_moderator_id,
    moderator.id,
  );

  // Validate timestamps
  typia.assertGuard(resolvedReport.resolved_at!);
  TestValidator.predicate(
    "resolved_at timestamp is set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    resolvedReport.created_at,
    initialReport.created_at,
  );

  // Validate audit trail
  TestValidator.equals(
    "article ID preserved in audit trail",
    resolvedReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reporter member ID preserved",
    resolvedReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report category preserved",
    resolvedReport.report_category,
    selectedCategory,
  );
  TestValidator.equals(
    "report details preserved",
    resolvedReport.report_details,
    initialReport.report_details,
  );

  // Validate resolution notes document the editing action
  typia.assertGuard(resolvedReport.resolution_notes!);
  TestValidator.predicate(
    "resolution notes explain editing action taken",
    resolvedReport.resolution_notes.toLowerCase().includes("edited"),
  );
}
