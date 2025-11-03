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
 * Test retrieving a content report that targets a comment rather than an
 * article, validating the polymorphic relationship between reports and their
 * target content types.
 *
 * This test validates the complete workflow for comment-based content
 * reporting:
 *
 * 1. Create moderator account for category creation
 * 2. Authenticate as a member account
 * 3. Create a category for article organization
 * 4. Create an article to host comments
 * 5. Post a comment on the article
 * 6. Submit a content report flagging the comment for violations
 * 7. Retrieve the report to verify comment-specific reporting works correctly
 *
 * Validation points:
 *
 * - Report correctly references the comment as the target (not an article)
 * - Report includes comment-specific context for review
 * - Reported comment ID is accurately captured
 * - Report reason and details are properly stored
 * - Member can access their comment report just like article reports
 */
export async function test_api_report_retrieval_for_comment_violation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12) + "A1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create and authenticate as a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12) + "A1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 3: Create a category for article organization
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create an article to host comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 1 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Post a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Submit a content report flagging the comment for violations
  const reportReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "off_topic",
    "inappropriate_language",
    "personal_info",
    "other",
  ] as const;
  const selectedReason = RandomGenerator.pick(reportReasons);

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_article_id: null,
        reported_comment_id: comment.id,
        report_reason: selectedReason,
        report_details:
          selectedReason === "other"
            ? RandomGenerator.paragraph({ sentences: 2 })
            : RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(createdReport);

  // Step 7: Retrieve the report to verify comment-specific reporting works correctly
  const retrievedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Validate that report correctly references the comment as the target
  TestValidator.equals(
    "report should reference the comment ID",
    retrievedReport.reported_comment_id,
    comment.id,
  );

  // Validate that report does NOT reference an article
  TestValidator.equals(
    "report should not reference an article",
    retrievedReport.reported_article_id,
    null,
  );

  // Validate report reason is properly stored
  TestValidator.equals(
    "report reason should match submitted reason",
    retrievedReport.report_reason,
    selectedReason,
  );

  // Validate reporter information matches the member
  TestValidator.equals(
    "reporter should be the authenticated member",
    retrievedReport.reporter.id,
    member.id,
  );

  // Validate reported comment summary is included
  typia.assertGuard(retrievedReport.reportedComment!);
  TestValidator.equals(
    "reported comment should reference the correct comment",
    retrievedReport.reportedComment.id,
    comment.id,
  );

  // Validate report status is pending for new reports
  TestValidator.equals(
    "report status should be pending",
    retrievedReport.status,
    "pending",
  );
}
