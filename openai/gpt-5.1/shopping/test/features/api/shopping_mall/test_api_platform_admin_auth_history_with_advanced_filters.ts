import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuthLog";
import type { IShoppingMallAuthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthLog";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate advanced filtering and pagination for platform admin auth history.
 *
 * Business goal: Ensure that a platform administrator can query their
 * authentication history with complex filters — including actor scoping, event
 * type selection, success flag, and time-window constraints — and receive a
 * paginated result set that is structurally correct and logically consistent
 * with the requested filters.
 *
 * Test flow:
 *
 * 1. Register a first platform admin (admin A) via POST /auth/platformAdmin/join.
 *
 *    - Capture the returned IShoppingMallPlatformAdmin.IAuthorized, including its id
 *         and timestamps.
 * 2. Register a second platform admin (admin B) via another join call to generate
 *    additional platformAdmin-scoped auth logs that must not appear when
 *    filtering by admin A's id.
 * 3. Trigger several customer password reset requests via POST
 *    /auth/customer/password/reset/request using random customer emails. These
 *    generate customer auth events that should be excluded when filtering by
 *    actor_type="platformAdmin" and actor_id=adminA.id.
 * 4. Define a time window around admin A's createdAt:
 *
 *    - Created_from: a moment slightly before admin A's createdAt
 *    - Created_to: a moment slightly after admin A's createdAt
 * 5. Call PATCH
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/authHistory
 *    for admin A with a body based on IShoppingMallAuthLog.IRequest:
 *
 *    - Page: 1 (one-based index per DTO docs)
 *    - Limit: small (e.g., 1) to exercise pagination limits
 *    - Actor_type: "platformAdmin"
 *    - Actor_id: adminA.id
 *    - Event_types: ["login.success"] (assuming join is logged as such)
 *    - Success: true
 *    - Created_from / created_to: the defined window around admin A's join time
 * 6. Validate the response:
 *
 *    - Typia.assert on IPageIShoppingMallAuthLog.ISummary
 *    - Pagination.limit is non-negative and data.length <= limit
 *    - If records > 0 then pages >= 1 and 0 <= current < pages
 *    - If records == 0 then pages == 0 and data.length == 0
 *    - Every log entry in data:
 *
 *         - ActorType === "platformAdmin"
 *         - ActorId is either undefined or equal to adminA.id, but never a different id
 *         - EventType is one of the requested event_types (here: "login.success")
 *         - OccurredAt is within [created_from, created_to]
 * 7. If pagination.records > limit (i.e., more than one matching event), confirm
 *    that the first page's data length equals limit and that pagination.pages >
 *    1.
 * 8. Issue a second authHistory.index call with a wider time window and only
 *    actor_type="platformAdmin" (no actor_id), same limit, and same
 *    event_types/success filters:
 *
 *    - Validate that the total number of entries for adminA in this wider search is
 *         at least as large as in the first, more constrained query (filter
 *         adminA entries client-side using actorId).
 * 9. Issue a third authHistory.index call with a deliberately empty window
 *    (created_from and created_to far before any join) and validate that the
 *    response has zero records and an empty data array.
 */
export async function test_api_platform_admin_auth_history_with_advanced_filters(
  connection: api.IConnection,
) {
  // 1. Register first platform admin (Admin A)
  const adminARequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminARequest,
    });
  typia.assert(adminA);

  // 2. Register second platform admin (Admin B)
  const adminBRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBRequest,
    });
  typia.assert(adminB);

  // 3. Trigger several customer password reset requests to create noise logs
  await ArrayUtil.asyncRepeat(3, async () => {
    const resetInput = {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

    const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
      await api.functional.auth.customer.password.reset.request.requestPasswordReset(
        connection,
        { body: resetInput },
      );
    typia.assert(resetResult);
  });

  // Helper to parse date-time strings safely
  const parseDateTime = (value: string & tags.Format<"date-time">): Date => {
    return new Date(value as string);
  };

  // 4. Define time window around Admin A's createdAt
  const adminACreatedAt: Date = parseDateTime(adminA.createdAt);
  const windowBeforeMs = 60_000; // 1 minute before
  const windowAfterMs = 60_000; // 1 minute after
  const createdFrom: string & tags.Format<"date-time"> = new Date(
    adminACreatedAt.getTime() - windowBeforeMs,
  ).toISOString() as string & tags.Format<"date-time">;
  const createdTo: string & tags.Format<"date-time"> = new Date(
    adminACreatedAt.getTime() + windowAfterMs,
  ).toISOString() as string & tags.Format<"date-time">;

  const limit: number & tags.Type<"int32"> = 1 as number & tags.Type<"int32">;
  const page: number & tags.Type<"int32"> = 1 as number & tags.Type<"int32">;

  const filterBodyForAdminA = {
    page,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "platformAdmin",
    actor_id: adminA.id,
    event_types: ["login.success"],
    success: true,
    failure_reasons: undefined,
    ip: undefined,
    user_agent: undefined,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  // 5. First auth history query: narrow window, admin-scoped
  const adminAHistoryPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
      connection,
      {
        platformAdminId: adminA.id,
        body: filterBodyForAdminA,
      },
    );
  typia.assert(adminAHistoryPage);

  const paginationA: IPage.IPagination = adminAHistoryPage.pagination;

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination limit should be non-negative",
    paginationA.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page index should be non-negative",
    paginationA.current >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    paginationA.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    paginationA.records >= 0,
  );
  TestValidator.predicate(
    "data length should not exceed pagination limit",
    adminAHistoryPage.data.length <= paginationA.limit,
  );

  if (paginationA.records === 0) {
    TestValidator.equals(
      "when no records, data should be empty",
      adminAHistoryPage.data.length,
      0,
    );
    TestValidator.equals(
      "when no records, pages should be zero",
      paginationA.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records exist, pages should be at least one",
      paginationA.pages >= 1,
    );
    TestValidator.predicate(
      "current page index should be less than total pages when records exist",
      paginationA.current < paginationA.pages,
    );
  }

  // Validate each log entry matches filters
  const createdFromDate = new Date(createdFrom as string);
  const createdToDate = new Date(createdTo as string);

  for (const log of adminAHistoryPage.data) {
    typia.assert<IShoppingMallAuthLog.ISummary>(log);

    TestValidator.equals(
      "log actorType should be platformAdmin",
      log.actorType,
      "platformAdmin",
    );

    if (log.actorId !== undefined) {
      TestValidator.equals(
        "log actorId should equal adminA id when defined",
        log.actorId,
        adminA.id,
      );
    }

    TestValidator.predicate(
      "log eventType should be in requested event_types",
      filterBodyForAdminA.event_types?.includes(log.eventType) === true,
    );

    const occurred = new Date(log.occurredAt as string);
    TestValidator.predicate(
      "log occurredAt should be within created_from and created_to",
      occurred.getTime() >= createdFromDate.getTime() &&
        occurred.getTime() <= createdToDate.getTime(),
    );
  }

  if (paginationA.records > paginationA.limit) {
    TestValidator.equals(
      "when more records than limit, first page data length equals limit",
      adminAHistoryPage.data.length,
      paginationA.limit,
    );
    TestValidator.predicate(
      "when more records than limit, pages should be greater than one",
      paginationA.pages > 1,
    );
  }

  // 6. Second query: wider window, only actor_type filter, no actor_id
  const wideFrom = new Date(
    adminACreatedAt.getTime() - 5 * 60_000,
  ).toISOString() as string & tags.Format<"date-time">; // 5 minutes before
  const wideTo = new Date(
    adminACreatedAt.getTime() + 5 * 60_000,
  ).toISOString() as string & tags.Format<"date-time">; // 5 minutes after

  const wideFilterBody = {
    page,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "platformAdmin",
    actor_id: null,
    event_types: ["login.success"],
    success: true,
    failure_reasons: undefined,
    ip: undefined,
    user_agent: undefined,
    created_from: wideFrom,
    created_to: wideTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const wideHistoryPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
      connection,
      {
        platformAdminId: adminA.id,
        body: wideFilterBody,
      },
    );
  typia.assert(wideHistoryPage);

  const adminALogsInWide = wideHistoryPage.data.filter(
    (log) => log.actorId === adminA.id,
  );

  TestValidator.predicate(
    "number of adminA logs in wide window should be >= logs in narrow window",
    adminALogsInWide.length >= adminAHistoryPage.data.length,
  );

  // 7. Third query: empty window that should yield no results
  const veryOldFrom = new Date(0).toISOString() as string &
    tags.Format<"date-time">;
  const veryOldTo = new Date(1_000).toISOString() as string &
    tags.Format<"date-time">;

  const emptyWindowBody = {
    page,
    limit,
    sort_by: "created_at",
    sort_direction: "desc",
    actor_type: "platformAdmin",
    actor_id: adminA.id,
    event_types: ["login.success"],
    success: true,
    failure_reasons: undefined,
    ip: undefined,
    user_agent: undefined,
    created_from: veryOldFrom,
    created_to: veryOldTo,
  } satisfies IShoppingMallAuthLog.IRequest;

  const emptyHistoryPage: IPageIShoppingMallAuthLog.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.authHistory.index(
      connection,
      {
        platformAdminId: adminA.id,
        body: emptyWindowBody,
      },
    );
  typia.assert(emptyHistoryPage);

  TestValidator.equals(
    "empty window should return zero records",
    emptyHistoryPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty window should return zero pages",
    emptyHistoryPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty window should return no data entries",
    emptyHistoryPage.data.length,
    0,
  );
}
