import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Verify that deleting a non-existent discussion board report as an adminUser
 * fails without impacting existing reports.
 *
 * Business goal:
 *
 * - Ensure that DELETE /discussionBoard/adminUser/reports/{reportId} rejects
 *   stale or incorrect IDs instead of silently succeeding.
 * - Confirm that a failed deletion attempt against a non-existent ID does not
 *   accidentally affect other report records.
 *
 * High level flow:
 *
 * 1. Register a memberUser account (join) to represent a regular board user.
 * 2. Register an adminUser account (join) to obtain administrative privileges.
 * 3. As memberUser, create a legitimate report record using POST
 *    /discussionBoard/memberUser/reports.
 * 4. Switch to the adminUser actor (join already logs in, and we additionally
 *    perform an explicit admin login to mirror realistic multi-actor flows).
 * 5. Generate a random UUID that is guaranteed to differ from the
 *    legitimately-created report.id.
 * 6. Call DELETE /discussionBoard/adminUser/reports/{reportId} with this
 *    non-existent UUID and assert that the call fails using
 *    TestValidator.error. We intentionally do not assert a concrete HTTP status
 *    code in order to avoid forbidden HTTP status testing; any thrown error is
 *    sufficient to prove that the non-existent ID is not treated as a
 *    successful deletion.
 * 7. Since no GET-by-id endpoint is available in the SDK, we cannot re-fetch the
 *    original report to prove its continued existence. Instead, we rely on the
 *    fact that the backend scopes deletion strictly to the provided ID, and we
 *    assert only the negative behavior (error on non-existent ID) in this
 *    test.
 */
export async function test_api_admin_report_delete_for_nonexistent_report(
  connection: api.IConnection,
) {
  // 1. Register a memberUser via join to act as the reporting user.
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/signup/member",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register an adminUser via join to obtain administrative privileges.
  //    Calling join also issues tokens and sets Authorization header for
  //    subsequent admin-protected calls.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.local/signup/admin",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. Switch back to memberUser by logging in and create a legitimate report
  //    as memberUser.
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login/member",
    referrer: "https://frontend.local/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // Create a report; use random UUID for one of the targets. Exactly one of the
  // target_* fields must be set. Here we target an article.
  const targetArticleId = typia.random<string & tags.Format<"uuid">>();
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: targetArticleId,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  // 4. Switch to adminUser explicitly using login (even though join already
  //    authenticated, this mirrors real multi-actor scenarios).
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.local/login/admin",
    referrer: "https://frontend.local/admin/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 5. Generate a UUID that is different from createdReport.id for the
  //    non-existent reportId. Although the UUID space is huge, we also guard
  //    against the theoretical collision by looping until they differ.
  let nonexistentReportId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== createdReport.id) {
      nonexistentReportId = candidate;
      break;
    }
  }

  // 6. Attempt to delete the non-existent reportId as adminUser and assert that
  //    the operation fails. We do not assert on specific HTTP status codes to
  //    align with global rules; any thrown error fulfills the business
  //    requirement that invalid IDs are not treated as successful deletions.
  await TestValidator.error(
    "erase on non-existent reportId must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.erase(connection, {
        reportId: nonexistentReportId,
      });
    },
  );

  // 7. We cannot re-fetch the original report due to missing GET endpoint in
  //    the SDK, so this test concludes after confirming that deletion of a
  //    non-existent ID does not silently succeed.
}
