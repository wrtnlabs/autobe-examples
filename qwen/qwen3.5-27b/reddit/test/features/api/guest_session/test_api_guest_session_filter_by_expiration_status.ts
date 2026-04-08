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

/**
 * Test filtering guest sessions by expiration status to distinguish active vs expired sessions.
 *
 * Validates the guest session filtering functionality by testing both active (expired=false) and expired (expired=true) session filters. Ensures that sessions are correctly categorized based on their expired_at timestamp relative to the current time.
 *
 * The test verifies that the expired filter parameter correctly separates sessions into active and expired categories, and that this filtering works in combination with guest_id filtering for targeted session queries.
 *
 * 1. Register a guest account to obtain authentication and guest_id.
 * 2. Query active sessions (expired=false) and validate all returned sessions have expired_at >= current time.
 * 3. Query expired sessions (expired=true) and validate all returned sessions have expired_at < current time.
 * 4. Test combined filtering with guest_id and expired=false to get active sessions for specific guest.
 * 5. Test combined filtering with guest_id and expired=true to get expired sessions for specific guest.
 * 6. Validate response structure and pagination information for all queries.
 */
export async function test_api_guest_session_filter_by_expiration_status(
  connection: api.IConnection,
) {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(guestAuth);
  const guestId = guestAuth.id;
  const currentTime = new Date();
  // 2. Query active sessions (expired=false)
  const activeSessionsResponse =
    await api.functional.redditClone.guest.guest.sessions.index(
      guestConnection,
      {
        body: {
          expired: false,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // Validate all active sessions have expired_at >= current time
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} expired_at >= current time`,
      expiredAt >= currentTime,
    );
  }
  // 3. Query expired sessions (expired=true)
  const expiredSessionsResponse =
    await api.functional.redditClone.guest.guest.sessions.index(
      guestConnection,
      {
        body: {
          expired: true,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // Validate all expired sessions have expired_at < current time
  for (const session of expiredSessionsResponse.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `expired session ${session.id} expired_at < current time`,
      expiredAt < currentTime,
    );
  }
  // 4. Test combined filtering: guest_id + expired=false
  const activeGuestSessionsResponse =
    await api.functional.redditClone.guest.guest.sessions.index(
      guestConnection,
      {
        body: {
          guest_id: guestId,
          expired: false,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(activeGuestSessionsResponse);
  // Validate all sessions belong to the specific guest and are active
  for (const session of activeGuestSessionsResponse.data) {
    TestValidator.equals(
      `session ${session.id} belongs to guest ${guestId}`,
      session.guest.id,
      guestId,
    );
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `active session ${session.id} expired_at >= current time`,
      expiredAt >= currentTime,
    );
  }
  // 5. Test combined filtering: guest_id + expired=true
  const expiredGuestSessionsResponse =
    await api.functional.redditClone.guest.guest.sessions.index(
      guestConnection,
      {
        body: {
          guest_id: guestId,
          expired: true,
          limit: 100,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(expiredGuestSessionsResponse);
  // Validate all sessions belong to the specific guest and are expired
  for (const session of expiredGuestSessionsResponse.data) {
    TestValidator.equals(
      `session ${session.id} belongs to guest ${guestId}`,
      session.guest.id,
      guestId,
    );
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      `expired session ${session.id} expired_at < current time`,
      expiredAt < currentTime,
    );
  }
  // 6. Validate pagination structure
  TestValidator.predicate(
    "active sessions pagination has valid current page",
    activeSessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "expired sessions pagination has valid current page",
    expiredSessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active guest sessions pagination has valid current page",
    activeGuestSessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "expired guest sessions pagination has valid current page",
    expiredGuestSessionsResponse.pagination.current >= 1,
  );
}
