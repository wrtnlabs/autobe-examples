import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test session filtering by status, validating correct partitioning into active
 * and expired sets.
 *
 * Verifies that the `status` filter on the sessions endpoint correctly separates
 * sessions based on their `expired_at` timestamp relative to the current server
 * time. Active sessions must have `expired_at` in the future, while expired
 * sessions must have `expired_at` in the past. The two result sets must be
 * mutually exclusive with no overlapping session IDs, and pagination metadata
 * must accurately reflect the filtered record counts.
 *
 * 1. Guest authenticates via join, creating a fresh session with future expiration.
 * 2. Active sessions are queried with `status: "active"` and every returned
 *    session is verified to have `expired_at` in the future.
 * 3. Expired sessions are queried with `status: "expired"` and every returned
 *    session is verified to have `expired_at` in the past.
 * 4. The active and expired session ID sets are validated for mutual exclusivity.
 * 5. Pagination metadata is checked for internal consistency including record
 *    counts, limits, and current page.
 */
export async function test_api_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest — creates a session with future expired_at
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. Query active sessions
  const activeResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "active",
        limit: 100,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(activeResult);
  // 3. Query expired sessions
  const expiredResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection,
    {
      body: {
        status: "expired",
        limit: 100,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(expiredResult);
  // 4. Verify active sessions all have expired_at in the future
  const now = new Date();
  TestValidator.predicate(
    "Active sessions should contain at least one entry",
    activeResult.data.length > 0,
  );
  for (const session of activeResult.data) {
    TestValidator.predicate(
      `Active session has future expired_at`,
      new Date(session.expired_at).getTime() > now.getTime(),
    );
  }
  // 5. Verify expired sessions all have expired_at in the past
  for (const session of expiredResult.data) {
    TestValidator.predicate(
      `Expired session has past expired_at`,
      new Date(session.expired_at).getTime() <= now.getTime(),
    );
  }
  // 6. Verify mutual exclusivity — no session ID appears in both sets
  const activeIds = new Set(activeResult.data.map((s) => s.id));
  for (const session of expiredResult.data) {
    TestValidator.predicate(
      `Session should not appear in both active and expired sets`,
      !activeIds.has(session.id),
    );
  }
  // 7. Validate pagination metadata accuracy for active results
  TestValidator.equals(
    "Active pagination current page",
    activeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "Active pagination limit matches request",
    activeResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "Active pagination records >= data length",
    activeResult.pagination.records >= activeResult.data.length,
  );
  TestValidator.predicate(
    "Active pagination data fits within limit",
    activeResult.data.length <= activeResult.pagination.limit,
  );
  // 8. Validate pagination metadata accuracy for expired results
  TestValidator.equals(
    "Expired pagination current page",
    expiredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "Expired pagination limit matches request",
    expiredResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "Expired pagination records >= data length",
    expiredResult.pagination.records >= expiredResult.data.length,
  );
  TestValidator.predicate(
    "Expired pagination data fits within limit",
    expiredResult.data.length <= expiredResult.pagination.limit,
  );
}
