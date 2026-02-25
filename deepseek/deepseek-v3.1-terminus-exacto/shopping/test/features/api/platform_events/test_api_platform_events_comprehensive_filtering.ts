import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_platform_events_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Test 1: Filter by severity 'error' only
  const errorEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_severity: "error",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(errorEvents);
  // Validate all returned events have severity 'error'
  TestValidator.predicate("all events have error severity", () => {
    return errorEvents.data.every((event) => event.event_severity === "error");
  });
  // Test 2: Filter by date range (last 24 hours)
  const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const recentEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          date_from: dateFrom,
          date_to: dateTo,
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(recentEvents);
  // Validate all events fall within the date range
  TestValidator.predicate("all events within date range", () => {
    return recentEvents.data.every((event) => {
      const eventDate = new Date(event.created_at);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      return eventDate >= fromDate && eventDate <= toDate;
    });
  });
  // Test 3: Combine multiple filters
  const combinedFilterEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_severity: "error",
          date_from: dateFrom,
          search: "payment",
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(combinedFilterEvents);
  // Test 4: Edge case - overlapping date ranges
  const overlappingEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          date_from: dateTo,
          date_to: dateFrom, // Intentionally reversed
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(overlappingEvents);
  // Test 5: Pagination validation
  const page1 =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 3,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(page1);
  const page2 =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 3,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(page2);
  // Verify pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals(
    "consistent limit",
    page1.pagination.limit,
    page2.pagination.limit,
  );
  // Test 6: Empty result scenario
  const futureEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          date_from: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(futureEvents);
  // Test 7: Search term filtering
  const searchEvents =
    await api.functional.ecommerce.superAdministrator.platform_events.index(
      adminConnection,
      {
        body: {
          search: "system",
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(searchEvents);
}
