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
 * Test that a member can retrieve detailed information about a report they
 * previously submitted.
 *
 * This test validates the complete workflow of report creation and retrieval by
 * a member. It ensures that members can track the status of their own reports
 * for transparency.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Moderator creates a category
 * 3. Create and authenticate a member account
 * 4. Member creates an article under the category
 * 5. Member reports the article for a violation
 * 6. Member retrieves the report details using the report ID
 * 7. Validate all report information is correct and complete
 */
export async function test_api_report_retrieval_by_reporter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Moderator creates a category
  const category: IDiscussionBoardCategory =
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
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Member creates an article under the category
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Member reports the article for a violation
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
  const reportReason = RandomGenerator.pick(reportReasons);

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: {
        reported_article_id: article.id,
        reported_comment_id: null,
        report_reason: reportReason,
        report_details: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardReport.ICreate,
    });
  typia.assert(createdReport);

  // Step 6: Member retrieves the report details using the report ID
  const retrievedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(retrievedReport);

  // Step 7: Validate all report information is correct and complete
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    createdReport.id,
  );
  TestValidator.equals(
    "reporter member ID matches authenticated user",
    retrievedReport.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "reported article ID matches created article",
    retrievedReport.reported_article_id,
    article.id,
  );
  TestValidator.equals(
    "reported comment ID is null",
    retrievedReport.reported_comment_id,
    null,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report details matches",
    retrievedReport.report_details,
    createdReport.report_details,
  );
  TestValidator.equals("status is pending", retrievedReport.status, "pending");
  TestValidator.equals(
    "reviewing moderator ID is null",
    retrievedReport.reviewing_moderator_id,
    null,
  );
  TestValidator.equals(
    "resolution notes is null",
    retrievedReport.resolution_notes,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    retrievedReport.updated_at.length > 0,
  );
}
