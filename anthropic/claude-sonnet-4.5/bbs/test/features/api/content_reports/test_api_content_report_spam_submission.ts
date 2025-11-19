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
 * Test the complete workflow of a member submitting a spam content report.
 *
 * This test validates the end-to-end process where a member flags an article as
 * spam through the content reporting system. The test ensures proper
 * multi-actor authentication, article creation, and report submission with
 * comprehensive validation of the report data.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create article category (required for articles)
 * 3. Create member account and authenticate
 * 4. Member creates an article
 * 5. Member submits spam report for the article
 * 6. Validate report data, status, and references
 */
export async function test_api_content_report_spam_submission(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category setup
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discuss economic policies and market trends",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for article creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "192.168.1.100",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates an article to be reported
  const articleTitle = RandomGenerator.paragraph({ sentences: 2 });
  const articleBody = RandomGenerator.content({ paragraphs: 3 });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle satisfies string &
          tags.MinLength<5> &
          tags.MaxLength<200>,
        body: articleBody satisfies string &
          tags.MinLength<50> &
          tags.MaxLength<50000>,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate article was created correctly
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category.id,
  );
  TestValidator.equals(
    "article author is member",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );

  // Step 5: Member submits spam content report
  const reportDetails =
    "This article contains promotional spam links and violates community guidelines by advertising commercial products without disclosure.";

  const report =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Spam",
          report_details: reportDetails,
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report data
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report category is Spam",
    report.report_category,
    "Spam",
  );
  TestValidator.equals(
    "reported article ID matches",
    report.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "reporting member ID matches",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "report details preserved",
    report.report_details,
    reportDetails,
  );

  // Validate unresolved state
  TestValidator.equals(
    "report not yet resolved",
    report.resolved_by_moderator_id,
    null,
  );
  TestValidator.equals(
    "no resolution notes yet",
    report.resolution_notes,
    null,
  );
  TestValidator.equals("no resolution timestamp yet", report.resolved_at, null);
}
