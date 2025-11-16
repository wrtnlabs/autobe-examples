import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdminSession";

export async function test_api_admin_session_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new admin to establish authentication context
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphabets(5)}@example.com`,
    password: "StrongP@ssw0rd!",
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  const joinedAdmin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(joinedAdmin);

  // 2. Create the admin account explicitly
  const createAdminBody = {
    adminUsername: joinedAdmin.adminUsername,
    email: joinedAdmin.email,
    password: "StrongP@ssw0rd!",
    role: joinedAdmin.role,
  } satisfies IEconPolDiscussionBoardAdmin.ICreate;

  const createdAdmin: IEconPolDiscussionBoardAdmin =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.create(
      connection,
      { body: createAdminBody },
    );
  typia.assert(createdAdmin);

  // 3. Create a new admin session
  const sessionCreateBody = {
    ip: `192.168.${RandomGenerator.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])}.${RandomGenerator.pick(ArrayUtil.repeat(254, (i) => i + 1))}`,
    href: `https://admin.econpoldiscussionboard.com/dashboard/${joinedAdmin.adminUsername}`,
    referrer: "https://admin.econpoldiscussionboard.com/login",
    expiredAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), // 8 hours validity
  } satisfies IEconPolDiscussionBoardAdminSession.ICreate;

  const createdSession: IEconPolDiscussionBoardAdminSession =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardAdmins.sessions.create(
      connection,
      {
        adminUsername: joinedAdmin.adminUsername,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // 4. Validate returned session properties
  TestValidator.predicate(
    "session id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdSession.id,
    ),
  );

  TestValidator.predicate(
    "session owner id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      createdSession.econPolDiscussionBoardAdminId,
    ),
  );

  TestValidator.equals("ip matches", createdSession.ip, sessionCreateBody.ip);
  TestValidator.equals(
    "href matches",
    createdSession.href,
    sessionCreateBody.href,
  );
  TestValidator.equals(
    "referrer matches",
    createdSession.referrer,
    sessionCreateBody.referrer,
  );
  if (
    createdSession.expiredAt !== null &&
    createdSession.expiredAt !== undefined
  ) {
    TestValidator.predicate(
      "expiredAt matches ISO string format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        createdSession.expiredAt,
      ),
    );
  }
}
