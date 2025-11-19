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
 * Test moderator reviewing a content report and determining no action is
 * needed.
 *
 * This test validates the complete workflow where a moderator reviews a content
 * report and concludes that the reported article does not violate community
 * guidelines. The test ensures proper status transitions, timestamp updates,
 * moderator attribution, and transparency through resolution notes.
 *
 * Workflow:
 *
 * 1. Create moderator account and category
 * 2. Create member account and article
 * 3. Member submits content report
 * 4. Moderator reviews and resolves with 'no action' decision
 * 5. Validate all resolution fields are properly set
 */
export async function test_api_content_report_resolution_no_action(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation and report resolution
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/admin",
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
          description: "General topics and discussions",
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
      username: RandomGenerator.alphabets(10),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
      href: "https://example.com/member/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates an article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle,
        body: articleBody,
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

  const contentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: selectedCategory,
          report_details:
            "I believe this content may not be appropriate for this category, but I'm not entirely sure.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(contentReport);

  // Validate initial report state
  TestValidator.equals(
    "initial report status is pending",
    contentReport.status,
    "pending",
  );
  TestValidator.equals(
    "initial resolved_by_moderator_id is null",
    contentReport.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "initial resolution_notes is null",
    contentReport.resolution_notes,
    null,
  );
  TestValidator.equals(
    "initial resolved_at is null",
    contentReport.resolved_at,
    null,
  );

  // Step 6: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/reports",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Moderator reviews and resolves report with no action
  const resolutionNotes =
    "After careful review, this article does not violate our community guidelines. The content is on-topic and respectful. The report appears to be a misunderstanding of our content policies.";

  const resolvedReport =
    await api.functional.discussionBoard.moderator.contentReports.update(
      connection,
      {
        reportId: contentReport.id,
        body: {
          status: "reviewed_no_action",
          resolution_notes: resolutionNotes,
        } satisfies IDiscussionBoardContentReport.IUpdate,
      },
    );
  typia.assert(resolvedReport);

  // Step 8: Validate resolution fields
  TestValidator.equals(
    "status transitioned to reviewed_no_action",
    resolvedReport.status,
    "reviewed_no_action",
  );
  TestValidator.equals(
    "resolution_notes provides transparency",
    resolvedReport.resolution_notes,
    resolutionNotes,
  );
  TestValidator.equals(
    "resolved_by_moderator_id is populated",
    resolvedReport.resolved_by_moderator_id,
    moderator.id,
  );

  // Validate resolved_at timestamp is set
  TestValidator.predicate(
    "resolved_at timestamp is set",
    resolvedReport.resolved_at !== null &&
      resolvedReport.resolved_at !== undefined,
  );

  // Validate original report data remains unchanged
  TestValidator.equals(
    "article ID unchanged",
    resolvedReport.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "member ID unchanged",
    resolvedReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report category unchanged",
    resolvedReport.report_category,
    selectedCategory,
  );
}
