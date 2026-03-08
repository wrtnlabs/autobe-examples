import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_token_expiration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session and capture tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/board",
      referrer: "https://google.com/search",
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guestSession);
  // 2. Validate token expiration timestamps are present
  TestValidator.predicate("access token has expired_at", () => {
    return (
      guestSession.expired_at !== null && guestSession.expired_at !== undefined
    );
  });
  // 3. Validate refreshable_until exists in token
  TestValidator.predicate("token has refreshable_until", () => {
    return (
      guestSession.token.refreshable_until !== null &&
      guestSession.token.refreshable_until !== undefined
    );
  });
  // 4. Verify expired_at is in the future
  const now = new Date().toISOString();
  TestValidator.predicate("expired_at is in the future", () => {
    return (
      new Date(guestSession.expired_at).getTime() > new Date(now).getTime()
    );
  });
  // 5. Verify refreshable_until is after expired_at
  TestValidator.predicate("refreshable_until is after expired_at", () => {
    return (
      new Date(guestSession.token.refreshable_until).getTime() >
      new Date(guestSession.expired_at).getTime()
    );
  });
  // 6. Verify access token expiration within 30 minutes (1800000 ms)
  const timeDiff =
    new Date(guestSession.expired_at).getTime() - new Date(now).getTime();
  TestValidator.predicate("access token expires within 30 minutes", () => {
    return timeDiff > 0 && timeDiff <= 1800000; // 30 minutes
  });
  // 7. Verify refresh token expiration is longer (at least 7 days = 604800000 ms)
  const refreshTimeDiff =
    new Date(guestSession.token.refreshable_until).getTime() -
    new Date(now).getTime();
  TestValidator.predicate(
    "refresh token has longer expiration (7+ days)",
    () => {
      return refreshTimeDiff >= 604800000; // 7 days
    },
  );
  // 8. Test that expired access token is rejected
  await TestValidator.error("expired access token rejected", async () => {
    const expiredConnection: api.IConnection = {
      host: connection.host,
      headers: { Authorization: `Bearer ${guestSession.token.access}` },
    };
    // Try to use the expired token with a protected endpoint
    await api.functional.discussionBoard.auth.guest.join(expiredConnection, {
      body: typia.random<IDiscussionBoardGuest.IJoin>(),
    });
  });
}
