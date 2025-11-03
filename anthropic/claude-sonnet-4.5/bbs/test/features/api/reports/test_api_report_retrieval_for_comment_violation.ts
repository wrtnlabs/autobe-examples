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
 * Test retrieving a report that was filed against a comment for inappropriate
 * language violations.
 *
 * This test validates the polymorphic nature of report targets by creating and
 * retrieving a comment report, ensuring the system correctly identifies the
 * target as a comment rather than an article.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a discussion board category
 * 3. Create and authenticate a member account
 * 4. Create an article under the category
 * 5. Post a comment on the article
 * 6. Report the comment for inappropriate language
 * 7. Retrieve the report by ID
 * 8. Validate report structure and content
 */
export async function test_api_report_retrieval_for_comment_violation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create category
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 5: Post a comment on the article
  const commentData = {
    discussion_board_article_id: article.id,
    discussion_board_parent_comment_id: null,
    content: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 6: Report the comment for inappropriate language
  const reportData = {
    reported_article_id: null,
    reported_comment_id: comment.id,
    report_reason: "inappropriate_language",
    report_details: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(createdReport);

  // Step 7: Retrieve the report by ID
  const retrievedReport =
    await api.functional.discussionBoard.member.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Step 8: Validate report structure and content
  TestValidator.equals(
    "retrieved report ID matches created report ID",
    retrievedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report targets comment not article - article ID is null",
    retrievedReport.reported_article_id,
    null,
  );

  TestValidator.equals(
    "report targets comment - comment ID matches",
    retrievedReport.reported_comment_id,
    comment.id,
  );

  TestValidator.equals(
    "report reason is inappropriate language",
    retrievedReport.report_reason,
    "inappropriate_language",
  );

  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );

  TestValidator.equals(
    "reporter member ID matches",
    retrievedReport.discussion_board_member_id,
    member.id,
  );

  TestValidator.equals(
    "reporter information is included",
    retrievedReport.reporter.id,
    member.id,
  );

  TestValidator.equals(
    "reported comment information is included",
    typia.assert(retrievedReport.reportedComment!).id,
    comment.id,
  );

  TestValidator.equals(
    "reported article is null for comment reports",
    retrievedReport.reportedArticle,
    null,
  );
}
