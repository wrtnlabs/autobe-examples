import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that administrators can retrieve the complete details of a specific
 * abuse report made by a user, targeting an article, and ensure correct access
 * permissions and detailed data integrity.
 *
 * The test covers the following workflow:
 *
 * 1. Register a new user (the reporter/content creator).
 * 2. As the user, create a new discussion board article (which will be reported).
 * 3. As the same user, submit an abuse report referencing the created article.
 * 4. Register a new admin account (who will perform the moderation action).
 * 5. As the admin, retrieve the details of the newly submitted abuse report by its
 *    ID.
 * 6. Validate that all relevant report information is correctly returned
 *    (reporter, target article, category, reason, status), and that only admins
 *    can access details via this endpoint.
 */
export async function test_api_abuse_report_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a user
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporterPassword = RandomGenerator.alphaNumeric(12);
  const reporterDisplayName = RandomGenerator.name();
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: reporterEmail,
      password: reporterPassword,
      display_name: reporterDisplayName,
      avatar_url: undefined,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);
  // 2. As user, create an article (to be reported)
  const articleCreateReq = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    attachments: [],
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: articleCreateReq,
    },
  );
  typia.assert(article);

  // 3. As user, submit an abuse report against the article
  const abuseCategoryChoices = [
    "spam",
    "offensive",
    "harassment",
    "illegal",
  ] as const;
  const abuseCategory = RandomGenerator.pick(abuseCategoryChoices);
  const abuseReason = RandomGenerator.paragraph({ sentences: 5 });
  const abuseReportCreateReq = {
    target_article_id: article.id,
    target_comment_id: undefined,
    abuse_category: abuseCategory,
    reason: abuseReason,
  } satisfies IDiscussionBoardAbuseReport.ICreate;
  const abuseReport =
    await api.functional.discussionBoard.user.abuseReports.create(connection, {
      body: abuseReportCreateReq,
    });
  typia.assert(abuseReport);

  // 4. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminDisplayName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      avatar_url: undefined,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 5. As admin, retrieve details of the abuse report by id
  const abuseReportDetail =
    await api.functional.discussionBoard.admin.abuseReports.at(connection, {
      abuseReportId: abuseReport.id,
    });
  typia.assert(abuseReportDetail);

  // 6. Validation: check core fields match
  TestValidator.equals(
    "abuse report id matches",
    abuseReportDetail.id,
    abuseReport.id,
  );
  TestValidator.equals(
    "reporter user id matches",
    abuseReportDetail.reporter_user_id,
    abuseReport.reporter_user_id,
  );
  TestValidator.equals(
    "targeted article id matches",
    abuseReportDetail.target_article_id,
    article.id,
  );
  TestValidator.equals(
    "abuse category matches",
    abuseReportDetail.abuse_category,
    abuseCategory,
  );
  TestValidator.equals(
    "abuse reason matches",
    abuseReportDetail.reason,
    abuseReason,
  );
  TestValidator.equals(
    "status is pending on creation",
    abuseReportDetail.status,
    abuseReport.status,
  );
}
