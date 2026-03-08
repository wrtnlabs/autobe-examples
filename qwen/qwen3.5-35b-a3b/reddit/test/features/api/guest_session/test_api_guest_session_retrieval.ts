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

export async function test_api_guest_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestAuthorized = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(1),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAuthorized);
  // 2. Get sessionId from sessions array
  TestValidator.predicate(
    "guest has at least one session",
    guestAuthorized.sessions.length > 0,
  );
  const sessionId = guestAuthorized.sessions[0].id;
  // 3. Create authenticated connection with access token from first registration
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: `Bearer ${guestAuthorized.token.access}`,
  };
  // 4. Retrieve session information
  const session = await api.functional.redditPlatform.guest.sessions.at(
    guestConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate required fields
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.equals(
    "guest id matches",
    session.reddit_platform_guest_id,
    guestAuthorized.id,
  );
  TestValidator.predicate("ip address is not empty", session.ip.length > 0);
  TestValidator.predicate("href is valid uri", session.href.startsWith("http"));
  // 6. Validate timestamp ordering
  const createdAt = new Date(session.created_at);
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "created_at before expired_at",
    createdAt.getTime() < expiredAt.getTime(),
  );
  // 7. Verify no sensitive tokens in response (schema validation by typia.assert)
  // IRedditPlatformGuestSession does not contain token fields - this is validated by type system
  const sessionKeys = Object.keys(session);
  TestValidator.equals(
    "no access token in response",
    sessionKeys.includes("access_token"),
    false,
  );
  TestValidator.equals(
    "no refresh token in response",
    sessionKeys.includes("refresh_token"),
    false,
  );
}
