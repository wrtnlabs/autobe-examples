import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate admin moderation update of a discussion board report.
 *
 * Business goal
 *
 * - Ensure that a report created by a member user against an article can be
 *   updated by an authenticated admin user via the admin-only update endpoint,
 *   and that only mutable fields (status, action) change while identity fields
 *   remain stable.
 *
 * Flow
 *
 * 1. Register a member user (join) and authenticate as that member.
 * 2. As the member, create an article that can be reported.
 * 3. As the member, create a report against the article.
 * 4. Register an admin user (join) and authenticate as that admin.
 * 5. As the admin, update the report via PUT
 *    /discussionBoard/adminUser/reports/{reportId} changing status and action.
 * 6. Assert that:
 *
 *    - Status and action reflect the new values.
 *    - Immutable fields such as id, target_type, reporter_type, reason_code,
 *         created_at remain unchanged.
 */
export async function test_api_report_status_update_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberJoinBody =
    typia.random<IDiscussionBoardMemberUserJoin.IRequest>();

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates an article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    // categoryId must be a UUID; we use typia.random to satisfy Format<"uuid">
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

  // 3. Member creates a report against the article
  const reportCreateBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const originalReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(originalReport);

  // 4. Register an admin user (switch authentication context to admin)
  const adminJoinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, update the report's status and action
  const newStatus = "in_review";
  const newAction = "hide_content";

  const updateBody = {
    status: newStatus,
    action: newAction,
  } satisfies IDiscussionBoardReport.IUpdate;

  const updatedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.update(connection, {
      reportId: originalReport.id,
      body: updateBody,
    });
  typia.assert(updatedReport);

  // 6. Business assertions
  // Mutable fields updated
  TestValidator.equals(
    "report status should be updated by admin",
    updatedReport.status,
    newStatus,
  );
  TestValidator.equals(
    "report action should be updated by admin",
    updatedReport.action,
    newAction,
  );

  // Immutable and identity fields unchanged
  TestValidator.equals(
    "report id must remain unchanged",
    updatedReport.id,
    originalReport.id,
  );
  TestValidator.equals(
    "target_type must remain unchanged",
    updatedReport.target_type,
    originalReport.target_type,
  );
  TestValidator.equals(
    "reporter_type must remain unchanged",
    updatedReport.reporter_type,
    originalReport.reporter_type,
  );
  TestValidator.equals(
    "reason_code must remain unchanged",
    updatedReport.reason_code,
    originalReport.reason_code,
  );
  TestValidator.equals(
    "created_at must remain unchanged",
    updatedReport.created_at,
    originalReport.created_at,
  );
}
