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
 * Test the complete workflow for a member reporting an article that contains
 * spam.
 *
 * This test validates the content reporting mechanism by creating a moderator
 * account, setting up a category, creating a member account, publishing an
 * article, and then having the member report that article for spam violations.
 * It verifies that the report is successfully created with all required fields
 * populated correctly.
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Moderator creates a category for article classification
 * 3. Create and authenticate member account
 * 4. Member creates an article under the category
 * 5. Member reports the article for spam
 * 6. Validate report creation with correct status, reason, reporter, and article
 *    reference
 */
export async function test_api_report_article_spam_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a category
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member creates an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Member reports the article for spam
  const reportData = {
    reported_article_id: article.id,
    reported_comment_id: null,
    report_reason: "spam",
    report_details: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 6: Validate report creation with business logic checks
  TestValidator.equals(
    "reporter ID should match member ID",
    report.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "reported article ID should match",
    report.reported_article_id,
    article.id,
  );
  TestValidator.equals(
    "reported comment ID should be null",
    report.reported_comment_id,
    null,
  );
  TestValidator.equals(
    "report reason should be spam",
    report.report_reason,
    "spam",
  );
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.equals(
    "reviewing moderator should be null for pending report",
    report.reviewing_moderator_id,
    null,
  );
}
