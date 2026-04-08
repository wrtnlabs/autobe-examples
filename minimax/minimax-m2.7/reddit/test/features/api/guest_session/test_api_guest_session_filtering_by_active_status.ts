import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filtering_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestAuth = await authorize_guest_join(connection, {});
  typia.assert(guestAuth);
  // 2. Create guest connection with the authorization token
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuth.token.access}`,
  };
  // 3. Query sessions with isActive=true (active sessions: expired_at > NOW())
  const activeSessions =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          isActive: true,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 4. Query sessions with isActive=false (expired sessions: expired_at <= NOW())
  const expiredSessions =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          isActive: false,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // 5. Validate that active sessions have expired_at in the future
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "active session should have expired_at > now",
      expiredAt > now,
    );
  }
  // 6. Validate that expired sessions have expired_at <= now
  for (const session of expiredSessions.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired session should have expired_at <= now",
      expiredAt <= now,
    );
  }
}
