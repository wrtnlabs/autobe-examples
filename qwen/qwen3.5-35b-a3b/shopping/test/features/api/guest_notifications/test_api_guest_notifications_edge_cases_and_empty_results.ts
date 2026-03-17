import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_notifications_edge_cases_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      user_agent: null,
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(guest);
  // Create connection with guest token
  const guestApiConnection: api.IConnection = { host: connection.host };
  guestApiConnection.headers = { Authorization: guest.token.access };
  // 2. Query with no filters (empty results)
  const emptyResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      { body: {} satisfies IEcommerceMallNotification.IRequest },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
  // 3a. Test page beyond available pages
  const pageBeyondResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          page: 999,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(pageBeyondResult);
  TestValidator.equals(
    "page beyond has zero records",
    pageBeyondResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "page beyond has zero pages",
    pageBeyondResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page beyond has empty data",
    pageBeyondResult.data.length,
    0,
  );
  // 3b. Test minimum per_page (1)
  const minPerPageResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          per_page: 1,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(minPerPageResult);
  TestValidator.equals(
    "min per_page has zero records",
    minPerPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "min per_page has zero pages",
    minPerPageResult.pagination.pages,
    0,
  );
  // 3c. Test maximum per_page (100)
  const maxPerPageResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(maxPerPageResult);
  TestValidator.equals(
    "max per_page has zero records",
    maxPerPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "max per_page has zero pages",
    maxPerPageResult.pagination.pages,
    0,
  );
  // 4. Test invalid sort field names
  const invalidSortResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          sort: "invalid_field",
          order: "asc",
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(invalidSortResult);
  TestValidator.equals(
    "invalid sort has zero records",
    invalidSortResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid sort has zero pages",
    invalidSortResult.pagination.pages,
    0,
  );
  // 5. Test filter parameters that match no notifications
  const invalidTypeResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          type: "invalid_type",
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(invalidTypeResult);
  TestValidator.equals(
    "invalid type has zero records",
    invalidTypeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid type has zero pages",
    invalidTypeResult.pagination.pages,
    0,
  );
  // 6. Test read_status filter that matches nothing
  const readStatusResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          read_status: "nonexistent_status",
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(readStatusResult);
  TestValidator.equals(
    "nonexistent read_status has zero records",
    readStatusResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "nonexistent read_status has zero pages",
    readStatusResult.pagination.pages,
    0,
  );
  // 7. Test date range filter that matches nothing
  const dateRangeResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          created_at_from: new Date("1900-01-01").toISOString(),
          created_at_to: new Date("1900-01-02").toISOString(),
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range has zero records",
    dateRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "date range has zero pages",
    dateRangeResult.pagination.pages,
    0,
  );
  // 8. Test search query that matches nothing
  const searchResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          search: "nonexistent_notification_content_xyz123",
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search has zero records",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search has zero pages",
    searchResult.pagination.pages,
    0,
  );
  // 9. Test limit override parameter
  const limitResult =
    await api.functional.ecommerceMall.guest.notifications.index(
      guestApiConnection,
      {
        body: {
          limit: 0,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(limitResult);
  TestValidator.equals(
    "limit 0 has zero records",
    limitResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit 0 has zero pages",
    limitResult.pagination.pages,
    0,
  );
  // 10. Verify pagination structure consistency across all edge cases
  TestValidator.equals(
    "empty result current page is 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result limit matches input",
    emptyResult.pagination.limit,
    100,
  );
  TestValidator.equals(
    "page beyond current page is 999",
    pageBeyondResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "min per_page limit is 1",
    minPerPageResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "max per_page limit is 100",
    maxPerPageResult.pagination.limit,
    100,
  );
}
