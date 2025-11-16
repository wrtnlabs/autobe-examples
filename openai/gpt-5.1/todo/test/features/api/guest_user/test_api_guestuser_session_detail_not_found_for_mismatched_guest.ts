import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import type { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function test_api_guestuser_session_detail_not_found_for_mismatched_guest(
  connection: api.IConnection,
) {
  // 1. Create Guest A and its session via join
  const guestAJoinBody = typia.random<ITodoAppGuestUserJoin.IRequest>();
  const guestAAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestAJoinBody,
    });
  typia.assert(guestAAuth);

  const guestUserIdA = guestAAuth.guest.id;
  const sessionIdA = guestAAuth.session.id;

  // 2. Create Guest B (this will also change connection headers to Guest B token)
  const guestBJoinBody = typia.random<ITodoAppGuestUserJoin.IRequest>();
  const guestBAuth: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: guestBJoinBody,
    });
  typia.assert(guestBAuth);

  const guestUserIdB = guestBAuth.guest.id;

  // Sanity check: ensure Guest A and Guest B IDs are different
  TestValidator.notEquals(
    "guest A and guest B must be different",
    guestUserIdA,
    guestUserIdB,
  );

  // 3. Using Guest B's token, attempt to fetch Guest A's session with guestUserId_B and sessionId_A
  await TestValidator.error(
    "mismatched guest/session should not be found",
    async () => {
      await api.functional.todoApp.guestUser.guestUsers.sessions.at(
        connection,
        {
          guestUserId: guestUserIdB,
          sessionId: sessionIdA,
        },
      );
    },
  );
}
