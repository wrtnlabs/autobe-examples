import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListAdminSession";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate retrieving a full audit record for a Todo List admin authentication
 * session.
 *
 * 1. Register admin1 and obtain authorized context
 * 2. List admin1's sessions and extract sessionId
 * 3. Retrieve audit detail for sessionId and join summary/detail
 * 4. Register separate admin2 and establish parallel session
 * 5. Validate that admin2 cannot access admin1's session detail (forbidden)
 * 6. Confirm that audit/session data is strictly scoped per admin
 */
export async function test_api_admin_session_audit_record_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin (admin1)
  const email1 = typia.random<string & tags.Format<"email">>();
  const joinBody1 = {
    email: email1,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/login",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth1 = await api.functional.auth.admin.join(connection, {
    body: joinBody1,
  });
  typia.assert(adminAuth1);
  const adminId1 = adminAuth1.id;

  // 2. List sessions for admin1; extract sessionId
  const sessionPage1 =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: adminId1,
      body: {},
    });
  typia.assert(sessionPage1);
  TestValidator.predicate(
    "session page for admin1 has at least 1 session",
    sessionPage1.data.length > 0,
  );
  const sessionSummary1 = sessionPage1.data[0];
  const sessionId1 = sessionSummary1.id;

  // 3. Retrieve detail for admin1 session
  const sessionDetail1 = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: adminId1,
      sessionId: sessionId1,
    },
  );
  typia.assert(sessionDetail1);
  TestValidator.equals(
    "session id detail matches summary",
    sessionDetail1.id,
    sessionSummary1.id,
  );
  TestValidator.equals("ip matches", sessionDetail1.ip, sessionSummary1.ip);
  TestValidator.equals(
    "href matches",
    sessionDetail1.href,
    sessionSummary1.href,
  );
  TestValidator.equals(
    "referrer matches",
    sessionDetail1.referrer,
    sessionSummary1.referrer,
  );
  TestValidator.equals(
    "created_at matches",
    sessionDetail1.created_at,
    sessionSummary1.created_at,
  );
  TestValidator.equals(
    "expired_at matches",
    sessionDetail1.expired_at,
    sessionSummary1.expired_at,
  );

  // 4. Register second admin (admin2)
  const email2 = typia.random<string & tags.Format<"email">>();
  const joinBody2 = {
    email: email2,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/register2",
    referrer: "https://admin.example.com/login",
  } satisfies ITodoListAdmin.IJoin;
  const adminAuth2 = await api.functional.auth.admin.join(connection, {
    body: joinBody2,
  });
  typia.assert(adminAuth2);
  const adminId2 = adminAuth2.id;

  // 5. Try to access admin1 session with admin2 credentials (should be forbidden)
  await TestValidator.error(
    "admin2 access to admin1 session is forbidden",
    async () => {
      await api.functional.todoList.admin.admins.sessions.at(connection, {
        adminId: adminId1,
        sessionId: sessionId1,
      });
    },
  );

  // 6. Confirm admin2 can see only their own session(s)
  const sessionPage2 =
    await api.functional.todoList.admin.admins.sessions.index(connection, {
      adminId: adminId2,
      body: {},
    });
  typia.assert(sessionPage2);
  TestValidator.predicate(
    "session page for admin2 has at least 1 session",
    sessionPage2.data.length > 0,
  );
  const sessionSummary2 = sessionPage2.data[0];
  const sessionId2 = sessionSummary2.id;

  const sessionDetail2 = await api.functional.todoList.admin.admins.sessions.at(
    connection,
    {
      adminId: adminId2,
      sessionId: sessionId2,
    },
  );
  typia.assert(sessionDetail2);
  TestValidator.equals(
    "session id detail2 matches summary2",
    sessionDetail2.id,
    sessionSummary2.id,
  );
  TestValidator.equals("ip2 matches", sessionDetail2.ip, sessionSummary2.ip);
  TestValidator.equals(
    "href2 matches",
    sessionDetail2.href,
    sessionSummary2.href,
  );
  TestValidator.equals(
    "referrer2 matches",
    sessionDetail2.referrer,
    sessionSummary2.referrer,
  );
  TestValidator.equals(
    "created_at2 matches",
    sessionDetail2.created_at,
    sessionSummary2.created_at,
  );
  TestValidator.equals(
    "expired_at2 matches",
    sessionDetail2.expired_at,
    sessionSummary2.expired_at,
  );
}
