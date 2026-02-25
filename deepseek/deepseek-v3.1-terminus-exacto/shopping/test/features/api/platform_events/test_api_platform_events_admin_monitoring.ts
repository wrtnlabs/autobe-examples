import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_platform_events_admin_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin_password_123",
      },
    },
  );
  typia.assert(admin);
  // Step 2: Test basic filter with event_type
  const basicFilterResponse =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: "user_registration",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(basicFilterResponse);
  TestValidator.equals(
    "pagination structure present",
    typeof basicFilterResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    basicFilterResponse.pagination.current >= 0,
  );
  // Step 3: Test multiple filters combined
  const combinedFilterResponse =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: "system_startup",
          event_severity: "info",
          event_source: "api_gateway",
          date_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          date_to: new Date().toISOString(),
          search: "initialization",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter returns valid pagination",
    combinedFilterResponse.pagination.pages >= 0,
  );
  // Step 4: Test pagination with different limits
  const paginationTestResponse =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(paginationTestResponse);
  TestValidator.equals(
    "page limit is correct",
    paginationTestResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page is correct",
    paginationTestResponse.pagination.current,
    2,
  );
  // Step 5: Test empty filters (get all events)
  const allEventsResponse =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 15,
        },
      },
    );
  typia.assert(allEventsResponse);
  TestValidator.predicate(
    "all events response has valid structure",
    Array.isArray(allEventsResponse.data) &&
      typeof allEventsResponse.pagination === "object",
  );
  // Step 6: Validate event summary structure
  if (allEventsResponse.data.length > 0) {
    const event = allEventsResponse.data[0];
    TestValidator.predicate(
      "event has required fields",
      typeof event.id === "string" &&
        typeof event.event_type === "string" &&
        typeof event.event_severity === "string" &&
        typeof event.event_source === "string" &&
        (event.correlation_id === null ||
          typeof event.correlation_id === "string") &&
        typeof event.created_at === "string",
    );
  }
  // Step 7: Test search functionality
  const searchTestResponse =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          search: "error",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchTestResponse);
  TestValidator.predicate(
    "search response is valid",
    searchTestResponse.pagination.records >= 0,
  );
}
