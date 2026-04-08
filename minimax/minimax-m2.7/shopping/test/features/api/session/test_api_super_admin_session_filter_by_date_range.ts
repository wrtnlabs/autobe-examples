import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering super administrator sessions by creation date range.
 *
 * Validates the session list endpoint's date range filtering capabilities for super administrators. The endpoint supports filtering sessions by creation timestamp using `createdAtFrom` and `createdAtTo` parameters, returning only sessions that fall within the specified inclusive date boundaries.
 *
 * The test verifies:
 * - Sessions can be filtered by creation date using `createdAtFrom` (inclusive lower bound)
 * - Sessions can be filtered by both `createdAtFrom` and `createdAtTo` (inclusive date range)
 * - Date range boundaries are inclusive (sessions created exactly at boundary timestamps are included)
 * - Pagination metadata correctly reflects the filtered record count
 * - Sessions outside the date range are correctly excluded from results
 *
 * 1. Register a new super administrator account via authentication endpoint
 * 2. Create multiple sessions by making additional authenticated requests to generate test data
 * 3. Query all sessions without filters to establish baseline count
 * 4. Apply `createdAtFrom` filter with recent timestamp, validate only newer sessions returned
 * 5. Apply both `createdAtFrom` and `createdAtTo` filters defining a narrow range
 * 6. Validate boundary inclusivity and pagination accuracy
 */
export async function test_api_super_admin_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  // Store the creation time of the first session
  const firstSessionCreatedAt = new Date();
  const firstSessionTimestamp = firstSessionCreatedAt.toISOString();
  // 2. Create additional sessions by making authenticated requests
  // Each join creates a new session
  await api.functional.ecommerceMall.auth.superAdmin.join(
    { ...superAdminConnection },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: "https://example.com/test",
        referrer: "https://example.com/referrer",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  await api.functional.ecommerceMall.auth.superAdmin.join(
    { ...superAdminConnection },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
        href: "https://example.com/test2",
        referrer: "https://example.com/referrer2",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Get all sessions to establish baseline
  const allSessionsResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(allSessionsResponse);
  const totalSessions = allSessionsResponse.data.length;
  TestValidator.predicate(
    "should have multiple sessions for filtering",
    totalSessions >= 3,
  );
  // 4. Test filtering with createdAtFrom only (inclusive lower bound)
  const fromFilterDate = new Date(firstSessionCreatedAt.getTime() - 60000);
  const fromFilterTimestamp = fromFilterDate.toISOString();
  const fromFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: fromFilterTimestamp,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(fromFilteredResponse);
  // All sessions should be returned since fromFilter is before all sessions
  TestValidator.equals(
    "sessions from filter should include all sessions",
    fromFilteredResponse.data.length,
    totalSessions,
  );
  // Verify all returned sessions have createdAt >= fromFilterTimestamp
  for (const session of fromFilteredResponse.data) {
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      `session createdAt ${session.createdAt} should be >= fromFilter ${fromFilterTimestamp}`,
      sessionCreatedAt >= fromFilterDate.getTime(),
    );
  }
  // 5. Test filtering with date range (createdAtFrom AND createdAtTo)
  const middleSessionDate = new Date(firstSessionCreatedAt.getTime() + 50);
  const rangeEndDate = new Date(firstSessionCreatedAt.getTime() + 200);
  const rangeFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: middleSessionDate.toISOString(),
          createdAtTo: rangeEndDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(rangeFilteredResponse);
  // Validate pagination reflects filtered count
  TestValidator.equals(
    "pagination records should match filtered data length",
    rangeFilteredResponse.pagination.records,
    rangeFilteredResponse.data.length,
  );
  // Verify all returned sessions fall within the inclusive date range
  const rangeStartMs = middleSessionDate.getTime();
  const rangeEndMs = rangeEndDate.getTime();
  for (const session of rangeFilteredResponse.data) {
    const sessionCreatedAt = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      `session should be within range: ${middleSessionDate.toISOString()} <= ${session.createdAt} <= ${rangeEndDate.toISOString()}`,
      sessionCreatedAt >= rangeStartMs && sessionCreatedAt <= rangeEndMs,
    );
  }
  // 6. Test boundary inclusivity - exact timestamp matching
  const exactBoundaryResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: firstSessionTimestamp,
          createdAtTo: firstSessionTimestamp,
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(exactBoundaryResponse);
  // Should include sessions with createdAt exactly equal to boundary
  const firstSessionInResults = exactBoundaryResponse.data.some(
    (s) => s.createdAt === firstSessionTimestamp,
  );
  TestValidator.predicate(
    "session with exact boundary timestamp should be included",
    firstSessionInResults,
  );
  // 7. Test with future date range (should return empty results)
  const futureFromDate = new Date(Date.now() + 86400000);
  const futureToDate = new Date(Date.now() + 172800000);
  const futureFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {
          createdAtFrom: futureFromDate.toISOString(),
          createdAtTo: futureToDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(futureFilteredResponse);
  // Future date range should not include any historical sessions
  TestValidator.equals(
    "future date range should return empty results",
    futureFilteredResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for future range",
    futureFilteredResponse.pagination.records,
    0,
  );
}
