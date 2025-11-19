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
 * Test member reporting an article for offensive content violations.
 *
 * This test validates the complete content reporting workflow where a member
 * flags an article for policy violations. The test sets up the required
 * infrastructure (category and article) and then submits a content report using
 * the 'Offensive Content' category with detailed violation explanation.
 *
 * Workflow:
 *
 * 1. Create moderator account for category management
 * 2. Moderator creates article category (required for articles)
 * 3. Create member account for article creation and reporting
 * 4. Member creates an article (content to be reported)
 * 5. Member reports the article for offensive content violations
 * 6. Validate report initialization and metadata correctness
 */
export async function test_api_content_report_offensive_content(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: typia.random<string>(),
        display_name: RandomGenerator.name(),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates article category
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion topics for all members",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article creation and reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: typia.random<string>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        ip: undefined,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member creates an article to be reported
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Member reports the article for offensive content
  const report: IDiscussionBoardContentReport =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article.id,
          report_category: "Offensive Content",
          report_details:
            "This article contains inappropriate language and violates community guidelines regarding respectful discourse.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report metadata and initialization
  TestValidator.equals(
    "report references correct article",
    report.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "report category is Offensive Content",
    report.report_category,
    "Offensive Content",
  );

  TestValidator.equals(
    "report status is pending for new reports",
    report.status,
    "pending",
  );

  TestValidator.equals(
    "resolved_at is null for pending reports",
    report.resolved_at,
    null,
  );

  TestValidator.equals(
    "reporting member ID matches",
    report.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "no moderator assigned yet",
    report.resolved_by_moderator_id,
    null,
  );
}
