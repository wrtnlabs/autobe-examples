import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminSession";

/**
 * Validate retrieval of admin session detail metadata by authenticated admin.
 *
 * This test validates that a platform administrator, after registering and
 * being authenticated, can access the detailed metadata for one of their own
 * session records. The flow includes:
 *
 * 1. Register a new admin (with unique email/password/href/referrer), receive the
 *    authorized admin object.
 * 2. List all sessions for this admin using the PATCH
 *    /discussionBoard/admin/admins/:adminId/sessions endpoint.
 * 3. Select a sessionId from the result.
 * 4. Request the GET /discussionBoard/admin/admins/:adminId/sessions/:sessionId
 *    endpoint for session detail.
 * 5. Validate that all expected fields (id, admin ref, ip, href, referrer,
 *    created_at, expired_at) exist, and match the list/session summary values.
 *
 * This test ensures only sessions for the authenticated admin are accessible,
 * and attempts to access non-existent or other-admin sessions throw errors.
 */
export async function test_api_admin_session_details_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as a new admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + ".*A1",
    href: "https://test-admin-session-detail.example.com/first",
    referrer: "https://test-admin-session-detail.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;

  // 2. List all sessions for this admin
  const pageResult: IPageIDiscussionBoardAdminSession.ISummary =
    await api.functional.discussionBoard.admin.admins.sessions.index(
      connection,
      {
        adminId,
        body: {},
      },
    );
  typia.assert(pageResult);
  TestValidator.predicate(
    "has at least one session record",
    pageResult.data.length >= 1,
  );

  // 3. Pick a valid session
  const sessionSummary = pageResult.data[0];
  typia.assert(sessionSummary);

  // 4. Retrieve session detail for the chosen session
  const detail: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.admins.sessions.at(connection, {
      adminId,
      sessionId: sessionSummary.id,
    });
  typia.assert(detail);

  // 5. Validate all fields match summary/list values and schema requirements
  TestValidator.equals(
    "session id matches summary",
    detail.id,
    sessionSummary.id,
  );
  TestValidator.equals(
    "admin reference id matches",
    detail.discussion_board_admin_id,
    sessionSummary.admin.id,
  );
  TestValidator.equals("ip matches", detail.ip, sessionSummary.ip);
  TestValidator.equals("href matches", detail.href, sessionSummary.href);
  TestValidator.equals(
    "referrer matches",
    detail.referrer,
    sessionSummary.referrer,
  );
  TestValidator.equals(
    "session created_at matches",
    detail.created_at,
    sessionSummary.created_at,
  );
  TestValidator.equals(
    "session expired_at matches",
    detail.expired_at,
    sessionSummary.expired_at,
  );

  // 6. Validate error for non-existent session
  await TestValidator.error("error for non-existent session id", async () => {
    await api.functional.discussionBoard.admin.admins.sessions.at(connection, {
      adminId,
      sessionId: typia.random<string & tags.Format<"uuid">>(), // Likely non-existent
    });
  });

  // 7. Register a second (different) admin for unauthorized access test
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + ".*B2",
    href: "https://test-admin-session-detail.example.com/another",
    referrer: "https://test-admin-session-detail.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth2: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody2 });
  typia.assert(adminAuth2);
  const otherAdminId = adminAuth2.id;

  // 8. Attempt to access first admin's session with second admin's identity
  await TestValidator.error(
    "unauthorized session access is denied",
    async () => {
      await api.functional.discussionBoard.admin.admins.sessions.at(
        connection,
        {
          adminId: otherAdminId,
          sessionId: sessionSummary.id,
        },
      );
    },
  );
}
