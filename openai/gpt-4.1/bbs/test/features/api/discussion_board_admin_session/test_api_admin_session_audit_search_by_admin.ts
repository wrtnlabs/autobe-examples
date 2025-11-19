import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";

/**
 * Validates privileged admin session audit search and filtering.
 *
 * This test performs the end-to-end privileged listing of all login sessions
 * for a specific administrator account. It ensures only authenticated admins
 * can search sessions for any admin account, and validates session audit
 * filtering, pagination, and compliance requirements.
 *
 * Steps:
 *
 * 1. Register and login as an admin (auditor).
 * 2. Register a target admin (whose sessions will be listed/audited).
 * 3. Authenticate as the auditor admin.
 * 4. Query for session audit records for the target admin (using the PATCH
 *    /discussionBoard/admin/admins/{adminId}/sessions API).
 * 5. Specify various filtering/pagination criteria in
 *    IDiscussionBoardAdminSession.IRequest, including IP, href, and date
 *    bounds.
 * 6. Assert that session records are returned, are for the target admin, and that
 *    pagination info is correct.
 * 7. Verify result structure, type validity, and audit compliance.
 * 8. Ensure only admins can execute this privileged operation (basic negative test
 *    for authorization).
 */
export async function test_api_admin_session_audit_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as an admin (auditor)
  const auditorEmail = typia.random<string & tags.Format<"email">>();
  const auditorPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const auditorJoin = {
    email: auditorEmail,
    password: auditorPassword,
    href: "https://admin-join.example.com/registration",
    referrer: "https://admin-portal.example.com/main",
    ip: "127.0.0.1",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const auditorAdmin = await api.functional.auth.admin.join(connection, {
    body: auditorJoin,
  });
  typia.assert(auditorAdmin);

  // 2. Register a target admin (whose sessions will be listed/audited)
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const targetJoin = {
    email: targetEmail,
    password: targetPassword,
    href: "https://admin-join.example.com/registration",
    referrer: "https://admin-portal.example.com/main",
    ip: "127.0.0.101",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: targetJoin,
  });
  typia.assert(targetAdmin);

  // 3. Authenticate as auditor again (ensure privileged token is set)
  await api.functional.auth.admin.join(connection, { body: auditorJoin });

  // 4. Query session audit for the target admin with various filters and pagination
  // a. Simple fetch - all sessions for target admin
  const sessionPage =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      connection,
      {
        adminId: targetAdmin.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionPage);
  TestValidator.predicate(
    "should have at least one session record (the one just created)",
    sessionPage.data.length > 0,
  );
  TestValidator.equals(
    "target admin ID matches in results",
    sessionPage.data[0]?.admin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "pagination page is correct",
    sessionPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches",
    sessionPage.pagination.limit,
    20,
  );

  // b. Filtering by exact IP
  const sessionPageByIp =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      connection,
      {
        adminId: targetAdmin.id,
        body: {
          ip: targetJoin.ip,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionPageByIp);
  ArrayUtil.repeat(sessionPageByIp.data.length, (i) => {
    TestValidator.equals(
      `session record #${i} has correct IP`,
      sessionPageByIp.data[i].ip,
      targetJoin.ip,
    );
    TestValidator.equals(
      `session record #${i} has admin ID`,
      sessionPageByIp.data[i].admin.id,
      targetAdmin.id,
    );
  });

  // c. Filtering by date range
  const nowIso = new Date().toISOString();
  const sessionPageByDate =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      connection,
      {
        adminId: targetAdmin.id,
        body: {
          created_at_from: targetAdmin.created_at,
          created_at_to: nowIso,
          limit: 5,
        } satisfies IDiscussionBoardAdminSession.IRequest,
      },
    );
  typia.assert(sessionPageByDate);
  ArrayUtil.repeat(sessionPageByDate.data.length, (i) => {
    TestValidator.predicate(
      `session record #${i} created_at within expected range`,
      sessionPageByDate.data[i].created_at >= targetAdmin.created_at &&
        sessionPageByDate.data[i].created_at <= nowIso,
    );
  });

  // 5. Authorization negative test: simulate unauthenticated request (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin cannot search admin sessions (should throw)",
    async () => {
      await api.functional.discussionBoard.admin.admins.sessions.index(
        unauthConn,
        {
          adminId: targetAdmin.id,
          body: { page: 1 } satisfies IDiscussionBoardAdminSession.IRequest,
        },
      );
    },
  );
}
