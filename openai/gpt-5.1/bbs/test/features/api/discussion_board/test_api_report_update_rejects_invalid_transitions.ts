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
 * Validate that admin report updates reject invalid moderation transitions.
 *
 * Business goal: Ensure that once a discussion board report has been progressed
 * by an administrator using the adminUser update endpoint, attempts to move it
 * into an earlier or conflicting workflow state are rejected as business rule
 * violations rather than silently accepted.
 *
 * High-level flow:
 *
 * 1. Register a member user and implicitly obtain a member session.
 * 2. As the member, create a discussion board article.
 * 3. As the member, create a report targeting that article.
 * 4. Register an admin user and implicitly obtain an admin session.
 * 5. As the admin, perform a first (assumed valid) update of the report to move it
 *    into a resolved-like state by setting status/action.
 * 6. Immediately attempt a second, clearly conflicting update that tries to revert
 *    the report to an initial-like state.
 * 7. Assert that the second update fails (throws) and that the previously returned
 *    report object from the first update remains unchanged in memory.
 */
export async function test_api_report_update_rejects_invalid_transitions(
  connection: api.IConnection,
) {
  // 1. Member joins
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.local/join",
    referrer: "https://frontend.local/landing",
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
    // Use a random UUID for categoryId; backend may map or validate it.
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

  // 3. Member creates a report targeting that article
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 4. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://frontend.local/admin/join",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin performs a first, assumed valid update to a resolved-like state
  const firstUpdateBody = {
    status: "resolved",
    action: "keep",
  } satisfies IDiscussionBoardReport.IUpdate;

  const resolvedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.update(connection, {
      reportId: createdReport.id,
      body: firstUpdateBody,
    });
  typia.assert(resolvedReport);

  // Sanity-check that update reflected our request in response object
  TestValidator.equals(
    "first update status should match request body",
    firstUpdateBody.status,
    resolvedReport.status,
  );
  TestValidator.equals(
    "first update action should match request body",
    firstUpdateBody.action,
    resolvedReport.action,
  );

  // 6. Attempt an invalid transition: move back to a submitted-like state
  const invalidSecondUpdateBody = {
    status: "submitted",
    action: "none",
  } satisfies IDiscussionBoardReport.IUpdate;

  await TestValidator.error(
    "second report update with conflicting status transition must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.update(
        connection,
        {
          reportId: createdReport.id,
          body: invalidSecondUpdateBody,
        },
      );
    },
  );

  // 7. In-memory object from first update must still reflect the resolved state
  TestValidator.equals(
    "resolved report status remains resolved in local snapshot",
    firstUpdateBody.status,
    resolvedReport.status,
  );
  TestValidator.equals(
    "resolved report action remains keep in local snapshot",
    firstUpdateBody.action,
    resolvedReport.action,
  );
}
