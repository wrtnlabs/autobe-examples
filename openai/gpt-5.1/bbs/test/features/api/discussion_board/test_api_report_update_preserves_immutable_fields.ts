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
 * Validate that admin report update only changes mutable fields (status,
 * action) and preserves immutable identity fields of the report.
 *
 * Business flow:
 *
 * 1. Member joins and becomes authenticated.
 * 2. Member creates an article.
 * 3. Member creates a report against that article.
 * 4. Admin joins (becoming authenticated as adminUser).
 * 5. Admin updates the report via PUT
 *    /discussionBoard/adminUser/reports/{reportId} changing status and action.
 * 6. The response report is compared against the original to ensure
 *
 *    - Immutable fields (id, target_type, reporter_type, reason_code, created_at)
 *         are preserved
 *    - Mutable fields (status, action) are updated to the new values.
 */
export async function test_api_report_update_preserves_immutable_fields(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

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
    // Random UUID for category; in a real system this should reference an existing category
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
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const originalReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(originalReport);

  // 4. Admin joins (and becomes authenticated as adminUser)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin updates the report status and action
  const newStatus =
    originalReport.status === "submitted" ? "resolved" : "submitted";
  const newAction = originalReport.action === "none" ? "hide_content" : "none";

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

  // 6. Validate immutable fields are preserved
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

  // 7. Validate mutable fields follow the update payload
  TestValidator.equals(
    "status must be updated to new value",
    updatedReport.status,
    newStatus,
  );
  TestValidator.equals(
    "action must be updated to new value",
    updatedReport.action,
    newAction,
  );
}
