import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Verify platform admin security event search with time window and derived
 * filters.
 *
 * Business goal: Ensure that an authenticated platform administrator can search
 * `shopping_mall_security_events` using a time range and categorical filters
 * (event_type, actor_type, ip), and that the API enforces those filters
 * consistently while returning correct pagination metadata.
 *
 * High-level flow:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin and establishes an authorized session by setting
 *         the access token into the connection headers.
 * 2. Define a recent time window (for example, from a few hours ago until now).
 * 3. Call PATCH /shoppingMall/platformAdmin/securityEvents with only the
 *    time-window and basic pagination values to obtain a baseline page of
 *    security events.
 * 4. Validate baseline response:
 *
 *    - Response shape matches IPageIShoppingMallSecurityEvent.ISummary.
 *    - Pagination metadata is internally consistent.
 *    - All returned events have occurredAt within the requested time window.
 * 5. If the baseline page contains at least one event, derive a more specific
 *    filter from that event:
 *
 *    - Event_type = base.event_type
 *    - Actor_type = base.actor_type, if defined
 *    - Ip = base.ip_address, if non-null and non-empty
 * 6. Re-query the endpoint using the derived filters in combination with the same
 *    time window and a reasonable limit.
 * 7. Validate filtered response:
 *
 *    - Type and pagination properties remain valid.
 *    - Every returned event still lies within the time window.
 *    - Every returned event has event_type equal to the requested filter.
 *    - When actor_type filter was applied, every returned event has matching
 *         actor_type.
 *    - When ip filter was applied, every returned event has ip_address equal to the
 *         requested ip.
 *    - When both baseline and filtered responses have records, ensure that the
 *         filtered records count does not exceed the baseline records count.
 * 8. If the baseline response has no events, the test still passes as long as the
 *    type and pagination invariants are respected.
 */
export async function test_api_security_events_search_with_time_window_and_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session.
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
  });
  typia.assert(admin);

  // 2. Define a recent time window (e.g., last 6 hours).
  const now = new Date();
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const createdFrom = sixHoursAgo.toISOString();
  const createdTo = now.toISOString();

  // 3. Baseline search with only time window and pagination.
  const baselineRequestBody = {
    page: 1,
    limit: 20,
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const baselinePage =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      { body: baselineRequestBody },
    );
  typia.assert(baselinePage);

  const baselinePagination = baselinePage.pagination;
  const baselineData = baselinePage.data;

  // 4. Validate baseline pagination invariants.
  TestValidator.predicate(
    "baseline: limit must be non-negative",
    baselinePagination.limit >= 0,
  );
  TestValidator.predicate(
    "baseline: pages must be non-negative",
    baselinePagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline: records must be non-negative",
    baselinePagination.records >= 0,
  );

  if (baselinePagination.records === 0) {
    TestValidator.equals(
      "baseline: pages must be 0 when there are no records",
      baselinePagination.pages,
      0,
    );
    TestValidator.equals(
      "baseline: data must be empty when there are no records",
      baselineData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "baseline: pages must be at least 1 when records exist",
      baselinePagination.pages >= 1,
    );
    TestValidator.predicate(
      "baseline: data length cannot exceed limit",
      baselineData.length <= baselinePagination.limit,
    );
  }

  const createdFromMs = new Date(createdFrom).getTime();
  const createdToMs = new Date(createdTo).getTime();

  await ArrayUtil.asyncForEach(baselineData, async (event, index) => {
    const occurredAtMs = new Date(event.occurredAt).getTime();
    TestValidator.predicate(
      `baseline: event ${index} must be within time window`,
      createdFromMs <= occurredAtMs && occurredAtMs <= createdToMs,
    );
  });

  // 5. If no events, we can't derive categorical filters; test ends here.
  if (baselineData.length === 0) return;

  const baseEvent = baselineData[0];

  // 6. Build filtered request using derived filters from base event.
  const eventTypeFilter = baseEvent.event_type;
  const actorTypeFilter = baseEvent.actor_type;
  const ipFilter = baseEvent.ip_address ?? undefined;

  const filteredRequestBody = {
    page: 1,
    limit: 20,
    event_type: eventTypeFilter,
    created_from: createdFrom,
    created_to: createdTo,
    ...(actorTypeFilter !== undefined && { actor_type: actorTypeFilter }),
    ...(ipFilter !== undefined && ipFilter.length > 0 && { ip: ipFilter }),
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const filteredPage =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      { body: filteredRequestBody },
    );
  typia.assert(filteredPage);

  const filteredPagination = filteredPage.pagination;
  const filteredData = filteredPage.data;

  TestValidator.predicate(
    "filtered: limit must be non-negative",
    filteredPagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered: pages must be non-negative",
    filteredPagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered: records must be non-negative",
    filteredPagination.records >= 0,
  );

  if (filteredPagination.records === 0) {
    TestValidator.equals(
      "filtered: pages must be 0 when there are no records",
      filteredPagination.pages,
      0,
    );
    TestValidator.equals(
      "filtered: data must be empty when there are no records",
      filteredData.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "filtered: pages must be at least 1 when records exist",
      filteredPagination.pages >= 1,
    );
    TestValidator.predicate(
      "filtered: data length cannot exceed limit",
      filteredData.length <= filteredPagination.limit,
    );

    // When both baseline and filtered have records, filtered records
    // should not exceed baseline records because we added constraints.
    TestValidator.predicate(
      "filtered: record count should not exceed baseline records",
      filteredPagination.records <= baselinePagination.records,
    );
  }

  await ArrayUtil.asyncForEach(filteredData, async (event, index) => {
    const occurredAtMs = new Date(event.occurredAt).getTime();
    TestValidator.predicate(
      `filtered: event ${index} must be within time window`,
      createdFromMs <= occurredAtMs && occurredAtMs <= createdToMs,
    );

    TestValidator.equals(
      `filtered: event ${index} must match event_type filter`,
      event.event_type,
      eventTypeFilter,
    );

    if (actorTypeFilter !== undefined) {
      TestValidator.equals(
        `filtered: event ${index} must match actor_type filter`,
        event.actor_type,
        actorTypeFilter,
      );
    }

    if (ipFilter !== undefined && ipFilter.length > 0) {
      TestValidator.equals(
        `filtered: event ${index} must match ip filter`,
        event.ip_address,
        ipFilter,
      );
    }
  });
}
