import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_expiration_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create guest accounts with different expiration scenarios
  const now = new Date();
  // Create 3 guests - they will have sessions with different expiration times
  const guests = await ArrayUtil.asyncRepeat(3, async () => {
    const guestConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    });
    typia.assert(authorized);
    return {
      guestId: authorized.id,
      token: authorized.token,
      createdAt: authorized.created_at,
    };
  });
  // Query all sessions without filter to get baseline
  const allConnection: api.IConnection = { host: connection.host };
  const allSessions = await api.functional.hrm.guest.guest.sessions.index(
    allConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // Test 1: Filter with is_expired=true
  const expiredConnection: api.IConnection = { host: connection.host };
  const expiredSessions = await api.functional.hrm.guest.guest.sessions.index(
    expiredConnection,
    {
      body: {
        is_expired: true,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(expiredSessions);
  // Verify all returned sessions are actually expired
  for (const session of expiredSessions.data) {
    typia.assert(session);
    const expiredAt = new Date(session.expired_at);
    await TestValidator.predicate(
      `expired session ${session.id} has expired_at < now`,
      expiredAt < now,
    );
  }
  // Verify pagination metadata for expired filter
  TestValidator.equals(
    "expired sessions count matches data array length",
    expiredSessions.pagination.records,
    expiredSessions.data.length,
  );
  // Test 2: Filter with is_expired=false
  const activeConnection: api.IConnection = { host: connection.host };
  const activeSessions = await api.functional.hrm.guest.guest.sessions.index(
    activeConnection,
    {
      body: {
        is_expired: false,
        limit: 100,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Verify all returned sessions are actually active (not expired)
  for (const session of activeSessions.data) {
    typia.assert(session);
    const expiredAt = new Date(session.expired_at);
    await TestValidator.predicate(
      `active session ${session.id} has expired_at >= now`,
      expiredAt >= now,
    );
  }
  // Verify pagination metadata for active filter
  TestValidator.equals(
    "active sessions count matches data array length",
    activeSessions.pagination.records,
    activeSessions.data.length,
  );
  // Test 3: Verify total sessions = expired + active (no overlap, complete coverage)
  const totalFromFilters =
    expiredSessions.pagination.records + activeSessions.pagination.records;
  TestValidator.equals(
    "total sessions equals expired + active (no overlap)",
    totalFromFilters,
    allSessions.pagination.records,
  );
  // Test 4: Test pagination with is_expired filter
  const paginatedConnection: api.IConnection = { host: connection.host };
  const paginatedExpired = await api.functional.hrm.guest.guest.sessions.index(
    paginatedConnection,
    {
      body: {
        is_expired: true,
        page: 1,
        limit: 10,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(paginatedExpired);
  // Verify pagination fields are present and valid
  TestValidator.predicate(
    "pagination current is positive",
    paginatedExpired.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    paginatedExpired.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginatedExpired.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    paginatedExpired.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedExpired.data.length <= paginatedExpired.pagination.limit,
  );
}
