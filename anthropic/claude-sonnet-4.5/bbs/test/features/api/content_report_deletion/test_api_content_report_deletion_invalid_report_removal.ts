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
 * Test moderator deletion of invalid or erroneous content reports.
 *
 * This test validates the workflow where a member mistakenly reports content
 * that clearly doesn't violate guidelines, and a moderator removes the invalid
 * report rather than marking it as reviewed. The test creates member and
 * moderator accounts, establishes a category, creates a legitimate article,
 * submits an erroneous report against it, then has the moderator delete the
 * invalid report to clean up the moderation queue.
 *
 * Workflow:
 *
 * 1. Create member account for article creation and report submission
 * 2. Create moderator account to remove invalid reports
 * 3. Create article category for content organization
 * 4. Create legitimate article that will receive an erroneous report
 * 5. Submit invalid report that will be deleted rather than reviewed
 * 6. Moderator deletes the invalid report to clean up the queue
 */
export async function test_api_content_report_deletion_invalid_report_removal(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
      ip: "127.0.0.1",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for report deletion
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/admin",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Create article category (moderator is already authenticated)
  const categorySlug = RandomGenerator.alphabets(10);
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: categorySlug,
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 8,
          }),
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member context and create legitimate article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      ip: "127.0.0.1",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Member submits an invalid/erroneous report
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const selectedCategory = RandomGenerator.pick(reportCategories);

  const report =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: selectedCategory,
          report_details:
            "This was submitted by mistake - the article is actually legitimate and doesn't violate any guidelines.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );

  // Step 6: Switch to moderator context and delete the invalid report
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/moderator/dashboard",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 7: Delete the invalid report (DELETE operation returns void)
  await api.functional.discussionBoard.moderator.contentReports.erase(
    connection,
    {
      reportId: report.id,
    },
  );
}
