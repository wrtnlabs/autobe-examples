import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";

export async function test_api_admin_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and authenticates
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.name(1)}@admin.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  const authorizedAdmin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(authorizedAdmin);

  // 2. Create administrator account
  // Note: ICreate requires adminUsername, email, password, and role
  const adminCreateBody = {
    adminUsername: authorizedAdmin.adminUsername,
    email: authorizedAdmin.email,
    password: adminJoinBody.password,
    role: authorizedAdmin.role,
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // 3. Create a new admin session linked to the created adminUsername
  const sessionCreateBody = {
    ip: `${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(2)}.${RandomGenerator.alphaNumeric(3)}.${RandomGenerator.alphaNumeric(2)}`,
    href: `https://admin-panel.com/admin/${createdAdmin.adminUsername}`,
    referrer: `https://admin-panel.com/login`,
    expiredAt: null,
  } satisfies IEconPolDiscussionBoardAdminSession.ICreate;

  const createdSession: IEconPolDiscussionBoardAdminSession =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.create(
      connection,
      {
        adminUsername: createdAdmin.adminUsername,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // 4. Retrieve the created session by ID
  const retrievedSession: IEconPolDiscussionBoardAdminSession =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.at(
      connection,
      {
        adminUsername: createdAdmin.adminUsername,
        id: createdSession.id,
      },
    );
  typia.assert(retrievedSession);

  // 5. Validate that retrieved session matches the created session details
  TestValidator.equals(
    "adminUsername should match",
    retrievedSession.econPolDiscussionBoardAdminId,
    createdSession.econPolDiscussionBoardAdminId,
  );
  TestValidator.equals(
    "session id should match",
    retrievedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "ip addresses should match",
    retrievedSession.ip,
    createdSession.ip,
  );
  TestValidator.equals(
    "href should match",
    retrievedSession.href,
    createdSession.href,
  );
  TestValidator.equals(
    "referrer should match",
    retrievedSession.referrer,
    createdSession.referrer,
  );
  TestValidator.equals(
    "expiredAt should be null",
    retrievedSession.expiredAt,
    null,
  );
}
