import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_with_tracking_headers(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session with tracking headers
  const guestSession = await api.functional.redditClone.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(32),
        href: "https://reddit-clone.com/community/tech" as string &
          tags.Format<"uri">,
        referrer: "https://external-site.com/page" as string &
          tags.Format<"uri">,
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(guestSession);
  // Validate session ID is a valid UUID
  TestValidator.predicate(
    "session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestSession.id,
    ),
  );
  // Validate token structure (JWT format: header.payload.signature)
  TestValidator.equals(
    "access token is JWT format",
    guestSession.token.access.split(".").length,
    3,
  );
  TestValidator.equals(
    "refresh token is JWT format",
    guestSession.token.refresh.split(".").length,
    3,
  );
  TestValidator.predicate(
    "access token differs from refresh token",
    guestSession.token.access !== guestSession.token.refresh,
  );
  // Validate expiration times are valid ISO date-time strings
  TestValidator.predicate(
    "expired_at is valid date-time format",
    !isNaN(Date.parse(guestSession.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time format",
    !isNaN(Date.parse(guestSession.token.refreshable_until)),
  );
  // Validate token expiration logic
  const expiredAt = new Date(guestSession.token.expired_at);
  const refreshableUntil = new Date(guestSession.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("access token not expired", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // Guest tokens should have shorter access token expiration (typically 15-60 minutes)
  const accessTokenLifetimeMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "guest access token has short expiration (under 24 hours)",
    accessTokenLifetimeMinutes > 0 && accessTokenLifetimeMinutes < 24 * 60,
  );
  // Total session lifetime should be reasonable for guest (typically 1-7 days)
  const totalSessionLifetimeDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "guest session has limited lifetime (under 30 days)",
    totalSessionLifetimeDays > 0 && totalSessionLifetimeDays < 30,
  );
  // Create authenticated connection with guest token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${guestSession.token.access}`,
  };
  // Verify token structure is usable (3 JWT parts)
  TestValidator.equals(
    "token structure validated",
    guestSession.token.access.split(".").length,
    3,
  );
  // Create second guest session with different tracking data to verify session binding
  const secondGuestSession = await api.functional.redditClone.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(32),
        href: "https://reddit-clone.com/search?q=test" as string &
          tags.Format<"uri">,
        referrer: "https://google.com/search" as string & tags.Format<"uri">,
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(secondGuestSession);
  // Verify different fingerprints produce different session IDs
  TestValidator.notEquals(
    "different fingerprints produce different sessions",
    guestSession.id,
    secondGuestSession.id,
  );
  // Verify both sessions have valid token structures
  TestValidator.equals(
    "second session has valid JWT access token",
    secondGuestSession.token.access.split(".").length,
    3,
  );
  TestValidator.equals(
    "second session has valid JWT refresh token",
    secondGuestSession.token.refresh.split(".").length,
    3,
  );
  // Test with optional IP field included
  const guestSessionWithIp = await api.functional.redditClone.auth.guest.join(
    connection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(32),
        href: "https://reddit-clone.com/about" as string & tags.Format<"uri">,
        referrer: "https://twitter.com/post/123" as string & tags.Format<"uri">,
        ip: "192.168.1.100" as string & tags.Format<"ipv4">,
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(guestSessionWithIp);
  TestValidator.predicate(
    "session with IP has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guestSessionWithIp.id,
    ),
  );
}
