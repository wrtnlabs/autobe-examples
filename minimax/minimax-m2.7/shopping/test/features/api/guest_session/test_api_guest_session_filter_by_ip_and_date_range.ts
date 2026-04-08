import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_filter_by_ip_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all guest sessions first to understand what data exists
  const allSessions = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {} satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  TestValidator.equals(
    "pagination exists",
    allSessions.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has records",
    allSessions.pagination.pagination.records >= 0,
  );
  // 2. Test IP pattern filter
  const ipPattern = "127.0.0.%";
  const ipFiltered = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {
        ip: ipPattern,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(ipFiltered);
  // Verify IP matching
  for (const session of ipFiltered.data) {
    TestValidator.predicate(
      `Session ${session.id} IP should match pattern ${ipPattern}`,
      session.ip.startsWith("127.0.0."),
    );
  }
  // 3. Test date range filter
  const dateFrom = RandomGenerator.date(new Date(), -7 * 24 * 60 * 60 * 1000);
  const dateTo = new Date();
  const dateFiltered = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {
        createdAtFrom: dateFrom.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: dateTo.toISOString() as string & tags.Format<"date-time">,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(dateFiltered);
  // Verify date range matching
  for (const session of dateFiltered.data) {
    const sessionCreatedAt = new Date(session.createdAt);
    TestValidator.predicate(
      `Session ${session.id} should be within date range`,
      sessionCreatedAt >= dateFrom && sessionCreatedAt <= dateTo,
    );
  }
  // 4. Test combining IP pattern and date range filters
  const combinedFiltered =
    await api.functional.ecommerceMall.guest_sessions.index(connection, {
      body: {
        ip: ipPattern,
        createdAtFrom: dateFrom.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: dateTo.toISOString() as string & tags.Format<"date-time">,
      } satisfies IEcommerceMallGuestSession.IRequest,
    });
  typia.assert(combinedFiltered);
  // Verify combined filters
  for (const session of combinedFiltered.data) {
    const sessionCreatedAt = new Date(session.createdAt);
    TestValidator.predicate(
      `Session ${session.id} should match both IP and date range`,
      session.ip.startsWith("127.0.0.") &&
        sessionCreatedAt >= dateFrom &&
        sessionCreatedAt <= dateTo,
    );
  }
  // 5. Test pagination with filters
  const paginatedFiltered =
    await api.functional.ecommerceMall.guest_sessions.index(connection, {
      body: {
        ip: ipPattern,
        createdAtFrom: dateFrom.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: dateTo.toISOString() as string & tags.Format<"date-time">,
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallGuestSession.IRequest,
    });
  typia.assert(paginatedFiltered);
  // Verify pagination structure
  TestValidator.equals(
    "current page should be 1",
    paginatedFiltered.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 5",
    paginatedFiltered.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data should not exceed limit",
    paginatedFiltered.data.length <= 5,
  );
  // 6. Test edge case: date range with no matching sessions
  const pastDate = RandomGenerator.date(new Date(), -365 * 24 * 60 * 60 * 1000);
  const olderDate = new Date(pastDate.getTime() - 365 * 24 * 60 * 60 * 1000);
  const emptyResult = await api.functional.ecommerceMall.guest_sessions.index(
    connection,
    {
      body: {
        createdAtFrom: olderDate.toISOString() as string &
          tags.Format<"date-time">,
        createdAtTo: pastDate.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IEcommerceMallGuestSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result
  TestValidator.predicate(
    "should return empty data for date range with no sessions",
    emptyResult.data.length === 0,
  );
}
