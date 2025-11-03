import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow for a member reporting a comment for harassment.
 *
 * This test validates the end-to-end process of reporting a comment that
 * contains potentially harassing content. The workflow includes:
 *
 * 1. Moderator account creation and authentication
 * 2. Category creation by the moderator
 * 3. Member account creation and authentication
 * 4. Article creation by the member
 * 5. Comment creation on the article
 * 6. Report creation targeting the comment with harassment reason
 * 7. Validation of the report structure and content
 */
export async function test_api_report_comment_harassment_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create an article as the member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create a comment on the article with potentially harassing content
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Create a report for the comment with harassment reason
  const report = await api.functional.discussionBoard.member.reports.create(
    connection,
    {
      body: {
        reported_article_id: null,
        reported_comment_id: comment.id,
        report_reason: "harassment",
        report_details:
          "This comment contains harassing language and violates community guidelines.",
      } satisfies IDiscussionBoardReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Validate the report was created correctly
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report reason is harassment",
    report.report_reason,
    "harassment",
  );
  TestValidator.equals(
    "report targets comment not article",
    report.reported_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "report article id is null",
    report.reported_article_id,
    null,
  );
  TestValidator.equals(
    "report has detailed explanation",
    report.report_details,
    "This comment contains harassing language and violates community guidelines.",
  );
  TestValidator.equals(
    "report captures member id",
    report.reporter.id,
    member.id,
  );
  TestValidator.predicate(
    "report has created timestamp",
    report.created_at !== null && report.created_at !== undefined,
  );
  TestValidator.predicate(
    "report has updated timestamp",
    report.updated_at !== null && report.updated_at !== undefined,
  );
}
