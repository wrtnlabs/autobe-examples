import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

export async function test_api_admin_session_update(
  connection: api.IConnection,
) {
  // 1. Admin user registration to acquire authorization context
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password: "AdminPassw0rd!",
    nickname: RandomGenerator.name(2),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create initial session for the admin
  const sessionCreateBody = {
    ip: "192.168." + RandomGenerator.alphaNumeric(2),
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
    expired_at: null,
  } satisfies IDiscussionBoardAdminSession.ICreate;

  const createdSession: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.create(
      connection,
      {
        discussionBoardAdminId: admin.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // 3. Update session with modified details
  const sessionUpdateBody = {
    ip: "10.0.0." + RandomGenerator.alphaNumeric(2),
    href: "https://admin.example.com/settings",
    referrer: "https://admin.example.com/dashboard",
    expired_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour later
  } satisfies IDiscussionBoardAdminSession.IUpdate;

  const updatedSession: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.update(
      connection,
      {
        discussionBoardAdminId: admin.id,
        sessionId: createdSession.id,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  TestValidator.equals(
    "session id remains the same",
    updatedSession.id,
    createdSession.id,
  );
  TestValidator.equals(
    "session discussion_board_admin_id remains the same",
    updatedSession.discussion_board_admin_id,
    createdSession.discussion_board_admin_id,
  );
  TestValidator.equals(
    "session ip updated",
    updatedSession.ip,
    sessionUpdateBody.ip,
  );
  TestValidator.equals(
    "session href updated",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "session referrer updated",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "session expired_at updated",
    updatedSession.expired_at,
    sessionUpdateBody.expired_at,
  );
}
