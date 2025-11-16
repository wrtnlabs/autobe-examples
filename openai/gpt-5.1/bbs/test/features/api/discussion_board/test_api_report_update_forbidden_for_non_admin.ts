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
 * Ensure memberUser cannot call admin-only report update endpoint.
 *
 * Business goal:
 *
 * - Verify that the admin report update API PUT
 *   /discussionBoard/adminUser/reports/{reportId} is protected so that a normal
 *   member user cannot execute it.
 *
 * Flow:
 *
 * 1. Join as a member user (POST /auth/memberUser/join).
 * 2. As that member, create an article (POST
 *    /discussionBoard/memberUser/articles).
 * 3. As that member, create a report for the created article (POST
 *    /discussionBoard/memberUser/reports).
 * 4. While still authenticated as member, attempt to call the admin update
 *    endpoint for that report using a valid IDiscussionBoardReport.IUpdate
 *    payload and expect it to fail (authorization error), using
 *    TestValidator.error.
 *
 * We do not perform post-update state verification via an admin GET endpoint
 * because such an endpoint is not available in the given SDK surface; the
 * authorization failure itself is the assertion.
 */
export async function test_api_report_update_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain authenticated session via SDK
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create an article as the member user
  const articleCreateBody: IDiscussionBoardArticle.ICreate =
    typia.random<IDiscussionBoardArticle.ICreate>();

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Create a report against the created article as the member user
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // Sanity check that the created report has basic expected properties
  TestValidator.predicate(
    "created report should have non-empty reporter_type",
    report.reporter_type.length > 0,
  );

  // 4. Attempt to update the report via admin-only endpoint while still
  //    authenticated as a member user. This must fail with an authorization
  //    error. We do not assert specific HTTP status; we only require that an
  //    error is thrown.
  const updateBody = {
    status: "resolved",
    action: "delete_content",
  } satisfies IDiscussionBoardReport.IUpdate;

  await TestValidator.error(
    "member user cannot call admin report update",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.update(
        connection,
        {
          reportId: report.id,
          body: updateBody,
        },
      );
    },
  );
}
