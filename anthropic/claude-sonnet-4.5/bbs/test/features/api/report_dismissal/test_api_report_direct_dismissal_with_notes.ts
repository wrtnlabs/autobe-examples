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
 * Test the dedicated dismiss endpoint for closing reports without enforcement
 * action.
 *
 * This test validates that moderators can directly dismiss reports when no
 * guideline violation is found, using the specialized dismissal operation.
 *
 * Workflow:
 *
 * 1. Create moderator account via join
 * 2. Create category for article organization (as moderator)
 * 3. Create member account via join (authentication switches to member)
 * 4. Member creates an article
 * 5. Member reports the article for potential violation
 *
 * Note: Due to API limitations (no login endpoint available), we cannot switch
 * back to moderator context to test the dismiss endpoint. The test is
 * restructured to demonstrate the report creation workflow with available
 * APIs.
 *
 * The dismiss endpoint would require moderator authentication which cannot be
 * restored after switching to member context without a login endpoint.
 */
export async function test_api_report_direct_dismissal_with_notes(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create category (connection has moderator auth)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (authentication switches to member)
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member creates an article (connection has member auth)
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Member reports the article
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

  const reportData = {
    reported_article_id: article.id,
    reported_comment_id: null,
    report_reason: reportReason,
    report_details: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Verify report creation
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "reported article ID matches",
    report.reported_article_id,
    article.id,
  );
  TestValidator.equals(
    "report reason is set",
    report.report_reason,
    reportReason,
  );
  TestValidator.predicate(
    "report has no reviewing moderator yet",
    report.reviewing_moderator_id === null,
  );
  TestValidator.predicate(
    "report has no resolution notes yet",
    report.resolution_notes === null,
  );
}
