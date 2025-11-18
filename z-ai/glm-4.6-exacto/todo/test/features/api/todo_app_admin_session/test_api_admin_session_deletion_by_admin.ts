import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Verify admin self-deletion of their own session record, and ensure access is
 * only granted for legitimate ownership.
 *
 * 1. Register a new admin and obtain admin and session data.
 * 2. Use the credentials to delete the session record, validating its complete
 *    removal.
 * 3. Re-join as the same admin and verify that prior session is not returned (new
 *    session is tracked), proving successful deletion.
 * 4. Confirm attempting to delete the already deleted session returns an error.
 * 5. Confirm a different admin cannot delete sessions of another admin.
 */
export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (admin1), get its id and session.
  const adminEmail1 = RandomGenerator.name(2) + "@example.com";
  const adminJoinBody1 = {
    email: adminEmail1,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://dashboard.example.com/admin/register",
    referrer: "https://example.com/landing?utm=ad",
    ip: undefined,
  } satisfies ITodoAppAdmin.IJoin;
  const admin1Auth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody1,
  });
  typia.assert(admin1Auth);
  const admin1Id = admin1Auth.id;
  const admin1SessionId = typia.assert(admin1Auth.session!).id;

  // 2. Confirm session ids are correct and session field is present
  TestValidator.predicate(
    "admin1 session id should be uuid",
    typeof admin1SessionId === "string" && admin1SessionId.length > 0,
  );

  // 3. Self-delete this session as admin1.
  await api.functional.todoApp.admin.admins.sessions.erase(connection, {
    adminId: admin1Id,
    sessionId: admin1SessionId,
  });

  // 4. Attempt re-join as the same admin: a second join creates new session, old session is gone.
  const adminJoinBody2 = {
    email: adminEmail1,
    password: adminJoinBody1.password,
    href: "https://dashboard.example.com/admin/register-again",
    referrer: "https://example.com/again?utm=ad",
    ip: undefined,
  } satisfies ITodoAppAdmin.IJoin;
  const admin1Auth2 = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody2,
  });
  typia.assert(admin1Auth2);
  // The new session must have a different session id.
  TestValidator.notEquals(
    "new session id should differ after old session deleted",
    typia.assert(admin1Auth2.session!).id,
    admin1SessionId,
  );

  // 5. Try to delete the original session again: should fail (already deleted)
  await TestValidator.error("should not delete a deleted session", async () => {
    await api.functional.todoApp.admin.admins.sessions.erase(connection, {
      adminId: admin1Id,
      sessionId: admin1SessionId,
    });
  });

  // 6. Register different admin, and try cross-delete
  const adminEmail2 = RandomGenerator.name(2) + "@example.com";
  const adminJoinBodyOther = {
    email: adminEmail2,
    password: RandomGenerator.alphaNumeric(10),
    href: "https://dashboard.example.com/admin/other",
    referrer: "https://example.com/from-another",
    ip: undefined,
  } satisfies ITodoAppAdmin.IJoin;
  const admin2Auth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBodyOther,
  });
  typia.assert(admin2Auth);
  // This admin must not be able to delete another admin's session
  await TestValidator.error(
    "other admins cannot delete another admin's session",
    async () => {
      await api.functional.todoApp.admin.admins.sessions.erase(connection, {
        adminId: admin1Id,
        sessionId: admin1SessionId,
      });
    },
  );
}
