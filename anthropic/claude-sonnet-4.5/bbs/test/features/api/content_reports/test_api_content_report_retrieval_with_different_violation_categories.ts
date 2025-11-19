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

export async function test_api_content_report_retrieval_with_different_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
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

  // Step 3: Create member account for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create an article to be reported
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create reports with different violation categories
  const violationCategories = [
    "Spam",
    "Offensive Content",
    "Misinformation",
    "Off-Topic",
    "Other",
  ] as const;
  const createdReports: IDiscussionBoardContentReport[] = [];

  for (const violationCategory of violationCategories) {
    const report =
      await api.functional.discussionBoard.member.contentReports.create(
        connection,
        {
          body: {
            discussion_board_article_id: article.id,
            report_category: violationCategory,
            report_details: `This article contains ${violationCategory.toLowerCase()} and should be reviewed by moderators.`,
          } satisfies IDiscussionBoardContentReport.ICreate,
        },
      );
    typia.assert(report);
    createdReports.push(report);
  }

  // Step 6: Retrieve each report and verify the category
  for (let i = 0; i < createdReports.length; i++) {
    const createdReport = createdReports[i];
    const retrievedReport =
      await api.functional.discussionBoard.member.contentReports.at(
        connection,
        {
          reportId: createdReport.id,
        },
      );
    typia.assert(retrievedReport);

    TestValidator.equals(
      "report ID matches",
      retrievedReport.id,
      createdReport.id,
    );

    TestValidator.equals(
      "report category matches",
      retrievedReport.report_category,
      violationCategories[i],
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
      "status is pending",
      retrievedReport.status,
      "pending",
    );
  }
}
