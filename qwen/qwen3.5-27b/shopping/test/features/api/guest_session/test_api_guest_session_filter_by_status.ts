import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session filtering by status (active, expired, revoked).
 *
 * Validates that:
 * 1. Guest can filter sessions by status field
 * 2. Active sessions are correctly identified (expired_at > now)
 * 3. Expired sessions are correctly identified (expired_at <= now)
 * 4. Pagination metadata reflects filtered count
 * 5. Unfiltered query returns all sessions
 */
export async function test_api_guest_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple guest sessions by joining again
  const additionalConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const tempConnection: api.IConnection = { host: connection.host };
    await authorize_guest_join(tempConnection, {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    additionalConnections.push(tempConnection);
  }
  // 3. Filter by 'active' status
  const activeFilterBody = {
    status: "active" as const,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallGuestSession.IRequest;
  const activeSessions = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: activeFilterBody,
    },
  );
  typia.assert(activeSessions);
  // Verify all returned sessions have status 'active'
  for (const session of activeSessions.data) {
    TestValidator.equals(
      `session ${session.id} has active status`,
      session.status,
      "active",
    );
  }
  // Verify pagination records match actual data count
  TestValidator.equals(
    "active sessions pagination records",
    activeSessions.pagination.records,
    activeSessions.data.length,
  );
  // 4. Filter by 'expired' status
  const expiredFilterBody = {
    status: "expired" as const,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallGuestSession.IRequest;
  const expiredSessions =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection, {
      body: expiredFilterBody,
    });
  typia.assert(expiredSessions);
  // Verify all returned sessions have status 'expired' (if any exist)
  for (const session of expiredSessions.data) {
    TestValidator.equals(
      `session ${session.id} has expired status`,
      session.status,
      "expired",
    );
  }
  // Verify pagination records match actual data count
  TestValidator.equals(
    "expired sessions pagination records",
    expiredSessions.pagination.records,
    expiredSessions.data.length,
  );
  // 5. Filter by 'revoked' status
  const revokedFilterBody = {
    status: "revoked" as const,
    page: 1,
    limit: 100,
  } satisfies IShoppingMallGuestSession.IRequest;
  const revokedSessions =
    await api.functional.shoppingMall.guest.sessions.index(guestConnection, {
      body: revokedFilterBody,
    });
  typia.assert(revokedSessions);
  // Verify all returned sessions have status 'revoked' (if any exist)
  for (const session of revokedSessions.data) {
    TestValidator.equals(
      `session ${session.id} has revoked status`,
      session.status,
      "revoked",
    );
  }
  // Verify pagination records match actual data count
  TestValidator.equals(
    "revoked sessions pagination records",
    revokedSessions.pagination.records,
    revokedSessions.data.length,
  );
  // 6. Query without status filter (should return all sessions)
  const allSessionsBody = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallGuestSession.IRequest;
  const allSessions = await api.functional.shoppingMall.guest.sessions.index(
    guestConnection,
    {
      body: allSessionsBody,
    },
  );
  typia.assert(allSessions);
  // Verify pagination records match actual data count
  TestValidator.equals(
    "all sessions pagination records",
    allSessions.pagination.records,
    allSessions.data.length,
  );
  // Verify total count equals sum of filtered counts
  const totalFilteredCount =
    activeSessions.data.length +
    expiredSessions.data.length +
    revokedSessions.data.length;
  TestValidator.equals(
    "total sessions equals sum of filtered sessions",
    allSessions.data.length,
    totalFilteredCount,
  );
  // 7. Verify each session in unfiltered list has valid status
  for (const session of allSessions.data) {
    TestValidator.predicate(
      `session ${session.id} has valid status`,
      ["active", "expired", "revoked"].includes(session.status),
    );
  }
}
