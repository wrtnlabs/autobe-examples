import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

/**
 * Validate that an authorized guestUser can retrieve details of one of their
 * own guest sessions and that cross-guest access to sessions is denied.
 *
 * Business flow:
 *
 * 1. A first visitor joins as guestUser via POST /auth/guestUser/join, creating a
 *    guest identity and session.
 * 2. Using that same authorized context, the test calls GET
 *    /todoApp/guestUser/guestUsers/{guestUserId}/sessions/{sessionId} to
 *    retrieve the detailed session record.
 * 3. The test confirms that the returned ITodoAppGuestUserSession matches the
 *    requested session id and contains non-empty telemetry fields (ip, href,
 *    referrer) and valid timestamps.
 * 4. A second, independent guestUser joins, establishing its own identity and
 *    session.
 * 5. The second guestUser then attempts to fetch the first guest's session by
 *    mixing its own guestUserId with the first guest's sessionId, which must
 *    fail because the backend enforces ownership via
 *    todo_app_guestuser_sessions.todo_app_guestuser_id.
 */
export async function test_api_guestuser_session_detail_by_authorized_guest(
  connection: api.IConnection,
) {
  // 1. First guestUser joins, creating guest identity + session and obtaining tokens.
  const firstJoinBody = typia.random<ITodoAppGuestUserJoin.IRequest>();

  const firstAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: firstJoinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(firstAuthorized);

  const firstGuestId = firstAuthorized.guest.id;
  const firstSessionId = firstAuthorized.session.id;

  // 2. Authorized guest fetches their own session detail.
  const ownSession: ITodoAppGuestUserSession =
    await api.functional.todoApp.guestUser.guestUsers.sessions.at(connection, {
      guestUserId: firstGuestId,
      sessionId: firstSessionId,
    });
  typia.assert<ITodoAppGuestUserSession>(ownSession);

  // Validate that the session id matches the requested id.
  TestValidator.equals(
    "session id matches requested id",
    ownSession.id,
    firstSessionId,
  );

  // Telemetry fields should be non-empty strings for ip, href, and referrer.
  TestValidator.predicate("session ip non-empty", ownSession.ip.length > 0);

  TestValidator.predicate("session href non-empty", ownSession.href.length > 0);

  TestValidator.predicate(
    "session referrer non-empty",
    ownSession.referrer.length > 0,
  );

  // 3. Second guestUser joins independently, getting its own identity and session.
  const secondJoinBody = typia.random<ITodoAppGuestUserJoin.IRequest>();

  const secondAuthorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: secondJoinBody,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(secondAuthorized);

  const secondGuestId = secondAuthorized.guest.id;

  // 4. Cross-guest access: second guest tries to access the first guest's session.
  await TestValidator.error("other guest cannot access session", async () => {
    await api.functional.todoApp.guestUser.guestUsers.sessions.at(connection, {
      guestUserId: secondGuestId,
      sessionId: firstSessionId,
    });
  });
}
