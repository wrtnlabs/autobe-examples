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
 * Test date range filtering on the session listing endpoint.
 *
 * Validates that the sessions endpoint correctly filters results by creation date range using the closed-open interval pattern where created_at_start is the inclusive lower bound and created_at_end is the exclusive upper bound. Multiple guest sessions are created with staggered timestamps to populate the session table, then date range queries verify correct filtering behavior, edge cases, and pagination within filtered results.
 *
 * 1. Authenticate as a guest and create multiple additional guest sessions to generate entries with distinct created_at timestamps.
 * 2. Capture timestamps before and after session creation to define a known time window.
 * 3. Query sessions with created_at_start and created_at_end bounding the full window and verify every returned session falls within [start, end).
 * 4. Test the edge case where created_at_start equals created_at_end — a closed-open interval with zero width — expecting empty results with records: 0 and pages: 0.
 * 5. Verify pagination metadata correctly reflects empty results.
 * 6. Test pagination navigation within filtered results using a small page size.
 * 7. typia.assert on all responses ensures session summaries exclude sensitive token fields.
 */
export async function test_api_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Record timestamp before creating any sessions
  const beforeAll = new Date().toISOString();
  // 2. Create multiple guest sessions with staggered timestamps
  const guestConnection1: api.IConnection = { host: connection.host };
  const auth1 = await authorize_guest_join(guestConnection1, {});
  typia.assert(auth1);
  const guestConnection2: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection2, {});
  const guestConnection3: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection3, {});
  // 3. Record timestamp after creating sessions
  const afterAll = new Date().toISOString();
  // 4. Query sessions with wide date range [beforeAll, afterAll)
  const allResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection1,
    {
      body: {
        created_at_start: beforeAll,
        created_at_end: afterAll,
        limit: 100,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(allResult);
  // 5. Verify every returned session is within [start, end)
  for (const session of allResult.data) {
    TestValidator.predicate(
      "session created_at >= created_at_start",
      session.created_at >= beforeAll,
    );
    TestValidator.predicate(
      "session created_at < created_at_end",
      session.created_at < afterAll,
    );
  }
  // 6. Edge case: equal start and end bounds should return zero results
  const emptyResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection1,
    {
      body: {
        created_at_start: beforeAll,
        created_at_end: beforeAll,
        limit: 10,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty range records count is zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty range pages count is zero",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "empty range data array is empty",
    emptyResult.data.length === 0,
  );
  // 7. Pagination navigation within filtered results
  const pagedResult = await api.functional.erpHrm.guest.sessions.index(
    guestConnection1,
    {
      body: {
        created_at_start: beforeAll,
        created_at_end: afterAll,
        page: 1,
        limit: 1,
      } satisfies IErpHrmMemberSession.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.predicate(
    "paginated result respects limit",
    pagedResult.data.length <= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pagedResult.pagination.limit,
    1,
  );
}
