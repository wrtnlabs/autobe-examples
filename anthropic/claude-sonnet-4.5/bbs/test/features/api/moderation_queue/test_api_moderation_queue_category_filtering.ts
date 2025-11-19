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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test moderation queue filtering by report category to enable specialized
 * review workflows.
 *
 * This test validates that moderators can filter the moderation queue by report
 * category (Spam, Offensive Content, Misinformation, Off-Topic, Other) to focus
 * on specific types of policy violations. This enables workflow routing based
 * on moderator expertise - for example, spam reports may be handled quickly
 * while misinformation reports require careful fact-checking.
 *
 * Test Process:
 *
 * 1. Create moderator account for queue access
 * 2. Create article category for test content
 * 3. Create multiple member accounts (one per report category)
 * 4. Create articles to be reported
 * 5. Submit reports across all five categories
 * 6. Filter queue by each category and validate only matching reports returned
 */
export async function test_api_moderation_queue_category_filtering(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.name(1),
      href: "https://example.com/moderator/join",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: "test-category",
          description: "Category for testing",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Define all report categories to test
  const reportCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;

  // 4. Create members and articles, then submit reports for each category
  const createdReports: IDiscussionBoardContentReport[] = [];

  for (const reportCategory of reportCategories) {
    // Create member for this report
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member123",
        username: RandomGenerator.name(1),
        href: "https://example.com/member/join",
        referrer: "https://example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);

    // Create article to be reported
    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: {
          title: `Article for ${reportCategory} report`,
          body: RandomGenerator.paragraph({ sentences: 20 }),
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);

    // Submit report with specific category
    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: article.id,
            report_category: reportCategory,
            report_details: `This article violates ${reportCategory} policy`,
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    createdReports.push(report);
  }

  // 5. Switch to moderator account to access moderation queue
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://example.com/moderator/login",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // 6. Test filtering by each category
  for (const targetCategory of reportCategories) {
    const filteredResult =
      await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
        connection,
        {
          body: {
            report_category: targetCategory,
          } satisfies IDiscussionBoardContentReport.IRequest,
        },
      );
    typia.assert(filteredResult);

    // Validate that all returned reports match the target category
    TestValidator.predicate(
      `filtered by ${targetCategory} should return at least one report`,
      filteredResult.data.length > 0,
    );

    for (const report of filteredResult.data) {
      TestValidator.equals(
        `report category should match filter ${targetCategory}`,
        report.report_category,
        targetCategory,
      );
    }

    // Verify the expected report is included
    const expectedReport = createdReports.find(
      (r) => r.report_category === targetCategory,
    );
    typia.assertGuard(expectedReport!);

    const foundReport = filteredResult.data.find(
      (r) => r.id === expectedReport.id,
    );
    TestValidator.predicate(
      `expected ${targetCategory} report should be in filtered results`,
      foundReport !== undefined,
    );
  }
}
