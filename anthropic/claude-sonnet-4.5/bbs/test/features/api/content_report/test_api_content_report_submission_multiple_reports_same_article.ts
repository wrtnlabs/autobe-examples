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
 * Test multiple independent reports on the same article by different members.
 *
 * This test validates that the content moderation system properly handles
 * multiple independent reports from different members against the same article.
 * Each member can flag the same article for different violation categories, and
 * the system should create distinct report records with proper tracking.
 *
 * Test workflow:
 *
 * 1. Create moderator account and establish article category
 * 2. Create first member account and create an article
 * 3. Create second member account
 * 4. First member reports article for "Spam"
 * 5. Second member reports article for "Offensive Content"
 * 6. Validate both reports have distinct IDs, different reporters, different
 *    categories, and pending status
 */
export async function test_api_content_report_submission_multiple_reports_same_article(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
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
          description: "General topics for discussion",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "member123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  // Step 4: Create article with first member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "member456",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  // Step 6: First member reports article for "Spam"
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "member123",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report1 =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          report_category: "Spam",
          report_details:
            "This article contains spam content promoting commercial products",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report1);

  // Step 7: Second member reports article for "Offensive Content"
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "member456",
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report2 =
    await api.functional.discussionBoard.member.articles.reports.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          report_category: "Offensive Content",
          report_details:
            "This article contains offensive language and inappropriate content",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report2);

  // Step 8: Validate both reports
  TestValidator.predicate("report IDs are distinct", report1.id !== report2.id);
  TestValidator.equals(
    "both reports reference same article",
    report1.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "both reports reference same article",
    report2.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "reporting members are different",
    report1.discussion_board_member_id !== report2.discussion_board_member_id,
  );
  TestValidator.equals(
    "first report has Spam category",
    report1.report_category,
    "Spam",
  );
  TestValidator.equals(
    "second report has Offensive Content category",
    report2.report_category,
    "Offensive Content",
  );
  TestValidator.equals("first report is pending", report1.status, "pending");
  TestValidator.equals("second report is pending", report2.status, "pending");
}
