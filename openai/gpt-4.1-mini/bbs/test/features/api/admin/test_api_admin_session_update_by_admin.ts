import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";

export async function test_api_admin_session_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user authentication via /auth/admin/join
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.name(1).toLowerCase()}@company.com`,
    password: "P@ssw0rd!",
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  const adminAuth: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminAuth);

  // 2. Create administrator account
  const adminCreateBody = {
    adminUsername: adminJoinBody.username,
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    role: "admin",
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const adminAccount: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(adminAccount);

  // 3. Prepare session update data
  const sessionUpdateBody = {
    ip: "192.168.1.100",
    href: "https://admin.econpol.com/dashboard",
    referrer: "https://admin.econpol.com/login",
    expiredAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies IEconPolDiscussionBoardAdminSession.IUpdate;

  // 4. Generate a session ID UUID for testing
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 5. Update administrator session
  const updatedSession: IEconPolDiscussionBoardAdminSession =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.update(
      connection,
      {
        adminUsername: adminJoinBody.username,
        id: sessionId,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // 6. Validate the response session properties
  TestValidator.predicate(
    "updated session has non-empty econPolDiscussionBoardAdminId",
    typeof updatedSession.econPolDiscussionBoardAdminId === "string" &&
      updatedSession.econPolDiscussionBoardAdminId.length > 0,
  );

  TestValidator.equals(
    "updated session ip",
    updatedSession.ip,
    sessionUpdateBody.ip,
  );
  TestValidator.equals(
    "updated session href",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "updated session referrer",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );

  if (
    updatedSession.expiredAt !== null &&
    updatedSession.expiredAt !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(updatedSession.expiredAt);
    TestValidator.equals(
      "updated session expiredAt",
      updatedSession.expiredAt,
      sessionUpdateBody.expiredAt,
    );
  } else {
    TestValidator.predicate(
      "updated session expiredAt is null",
      updatedSession.expiredAt === null,
    );
  }
}
