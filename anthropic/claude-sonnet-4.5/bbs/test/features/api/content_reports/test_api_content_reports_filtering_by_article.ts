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
 * Test filtering content reports by article ID to validate moderation workflow.
 *
 * This validates the filtering functionality where moderators can query all
 * reports for a specific article. While the test cannot create actual reports
 * (no creation API exists), it validates that the filtering endpoint correctly
 * accepts article ID parameters and returns properly structured responses.
 *
 * Test flow:
 *
 * 1. Create moderator account for authentication
 * 2. Create member account and article
 * 3. Filter content reports by the article ID
 * 4. Validate response structure and filtering parameters
 *
 * This ensures the filtering API is working correctly for the moderation
 * workflow where moderators need to view all community reports about specific
 * content.
 */
export async function test_api_content_reports_filtering_by_article(
  connection: api.IConnection,
) {
  // Step 1: Moderator registration and authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "192.168.1.100",
      href: "https://discussion.example.com/moderator/join",
      referrer: "https://discussion.example.com/",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.101",
      href: "https://discussion.example.com/member/join",
      referrer: "https://discussion.example.com/",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Switch to moderator and create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      ip: "192.168.1.100",
      href: "https://discussion.example.com/moderator/dashboard",
      referrer: "https://discussion.example.com/",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discuss political topics and current events",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch to member and create article
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
      ip: "192.168.1.101",
      href: "https://discussion.example.com/articles/create",
      referrer: "https://discussion.example.com/",
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
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

  // Step 5: Switch back to moderator to filter reports
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      ip: "192.168.1.100",
      href: "https://discussion.example.com/moderator/reports",
      referrer: "https://discussion.example.com/moderator/dashboard",
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Filter content reports by article ID
  const filteredReports =
    await api.functional.discussionBoard.moderator.contentReports.index(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardContentReport.IRequest,
      },
    );
  typia.assert(filteredReports);

  // Step 7: Validate response structure
  TestValidator.predicate(
    "filtered reports response has valid pagination",
    filteredReports.pagination !== null &&
      filteredReports.pagination !== undefined,
  );

  TestValidator.predicate(
    "filtered reports response has data array",
    Array.isArray(filteredReports.data),
  );

  TestValidator.equals(
    "pagination current page matches request",
    filteredReports.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    filteredReports.pagination.limit,
    20,
  );

  // Step 8: Validate filtering works correctly
  for (const report of filteredReports.data) {
    TestValidator.equals(
      "all reports match the filtered article ID",
      report.discussion_board_article_id,
      article.id,
    );
  }
}
