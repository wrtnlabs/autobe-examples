import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";

/**
 * Validate the creation of active sessions for discussion board administrators.
 *
 * This test function performs the following sequential operations:
 *
 * 1. Registers a new administrator via the /auth/admin/join endpoint with randomly
 *    generated valid credentials.
 * 2. Creates a new active session for the registered admin, specifying IP, href
 *    (connection URL), and referrer URL, with the expired_at field set
 *    explicitly to null indicating an active session.
 * 3. Validates that the session creation response correctly captures input values
 *    and that the expired_at property is null.
 * 4. Creates a second session for the same admin to verify that multiple sessions
 *    can be created.
 * 5. Validates the second session's properties similarly, ensuring unique IDs and
 *    accurate input reflection.
 *
 * Throughout the test, typia.assert verifies the runtime types of API
 * responses, while TestValidator functions ensure business logic and value
 * correctness.
 */
export async function test_api_admin_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Register administrator via join endpoint with valid random data
  const joinBody: IDiscussionBoardAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(3),
  };
  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // Step 2: Create first session with active expired_at (null)
  const sessionCreateBody1: IDiscussionBoardAdminSession.ICreate = {
    ip: `${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(2)}.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(3)}`,
    href: `https://${RandomGenerator.alphaNumeric(5)}.com/${RandomGenerator.alphaNumeric(8)}` as string &
      tags.Format<"uri">,
    referrer:
      `https://${RandomGenerator.alphaNumeric(4)}.org/${RandomGenerator.alphaNumeric(4)}` as string &
        tags.Format<"uri">,
    expired_at: null,
  };
  const session1: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.create(
      connection,
      {
        discussionBoardAdminId: admin.id,
        body: sessionCreateBody1,
      },
    );
  typia.assert(session1);
  TestValidator.equals(
    "session1.ip matches input",
    session1.ip,
    sessionCreateBody1.ip,
  );
  TestValidator.equals(
    "session1.href matches input",
    session1.href,
    sessionCreateBody1.href,
  );
  TestValidator.equals(
    "session1.referrer matches input",
    session1.referrer,
    sessionCreateBody1.referrer,
  );
  TestValidator.equals(
    "session1.expired_at is null",
    session1.expired_at,
    null,
  );

  // Step 3: Create second session to confirm multiple sessions can be created
  const sessionCreateBody2: IDiscussionBoardAdminSession.ICreate = {
    ip: `192.168.1.${RandomGenerator.alphaNumeric(1)}`,
    href: `https://secondsession.example/${RandomGenerator.alphaNumeric(5)}` as string &
      tags.Format<"uri">,
    referrer:
      `https://referrer.site/${RandomGenerator.alphaNumeric(6)}` as string &
        tags.Format<"uri">,
    expired_at: null,
  };
  const session2: IDiscussionBoardAdminSession =
    await api.functional.discussionBoard.admin.discussionBoardAdmins.sessions.create(
      connection,
      {
        discussionBoardAdminId: admin.id,
        body: sessionCreateBody2,
      },
    );
  typia.assert(session2);
  TestValidator.notEquals(
    "session2.id differs from session1.id",
    session2.id,
    session1.id,
  );
  TestValidator.equals(
    "session2.ip matches input",
    session2.ip,
    sessionCreateBody2.ip,
  );
  TestValidator.equals(
    "session2.href matches input",
    session2.href,
    sessionCreateBody2.href,
  );
  TestValidator.equals(
    "session2.referrer matches input",
    session2.referrer,
    sessionCreateBody2.referrer,
  );
  TestValidator.equals(
    "session2.expired_at is null",
    session2.expired_at,
    null,
  );
}
