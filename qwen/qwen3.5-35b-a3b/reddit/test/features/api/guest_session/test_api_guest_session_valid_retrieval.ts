import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_valid_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session using the utility function
  const guestAuth = await authorize_guest_join(connection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  typia.assert(guestAuth);
  // 2. Create a guest-specific connection for authenticated requests
  const guestConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guestAuth.token.access },
  };
  // 3. Retrieve the guest session by its session ID
  const session = await api.functional.redditPlatform.guest.guest_sessions.at(
    guestConnection,
    {
      sessionId: guestAuth.id,
    },
  );
  typia.assert(session);
  // 4. Validate the session ID in response matches the request sessionId
  TestValidator.equals(
    "session id matches request sessionId",
    session.id,
    guestAuth.id,
  );
  // 5. Validate reddit_platform_guest_id matches the guest account id
  TestValidator.equals(
    "reddit_platform_guest_id matches guest id",
    session.reddit_platform_guest_id,
    guestAuth.id,
  );
  // 6. Validate created_at equals updated_at for new session
  TestValidator.equals(
    "updated_at equals created_at for new session",
    session.updated_at,
    session.created_at,
  );
  // 7. Validate session is not expired (current time < expired_at)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("session is not expired", expiredAt > now);
}
