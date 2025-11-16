import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that an authenticated member user can create a report for an
 * article.
 *
 * Business flow:
 *
 * 1. Join as a new discussion board member user (public join endpoint).
 * 2. Using the authenticated member context, create an article under some category
 *    using POST /discussionBoard/memberUser/articles.
 * 3. With the same member, create a report via POST
 *    /discussionBoard/memberUser/reports that targets the created article by
 *    target_article_id and provides a non-empty category (reason_code) and
 *    reason (description).
 * 4. Verify that the returned IDiscussionBoardReport reflects an article-targeted
 *    report, that reason_code mirrors the requested category, and that id and
 *    created_at are populated.
 */
export async function test_api_report_creation_for_article_by_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a discussion board article as this member
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    // In real world this should be an actual category id; for test we
    // generate a random UUID-compatible string that satisfies the type.
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Create a report targeting the created article
  const requestedCategory = "spam";
  const reportCreateBody = {
    category: requestedCategory,
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 4. Business assertions on report fields
  TestValidator.equals(
    "report should target the article type",
    report.target_type,
    "article",
  );

  TestValidator.equals(
    "reporter type should be memberuser",
    report.reporter_type,
    "memberuser",
  );

  TestValidator.equals(
    "reason_code should equal requested category",
    report.reason_code,
    requestedCategory,
  );

  TestValidator.predicate(
    "report id should be non-empty string",
    report.id.length > 0,
  );

  TestValidator.predicate(
    "report created_at should be non-empty string",
    report.created_at.length > 0,
  );

  // created_at and updated_at validated structurally by typia.assert above,
  // so here we just ensure they are present and non-empty from a business view.
}
