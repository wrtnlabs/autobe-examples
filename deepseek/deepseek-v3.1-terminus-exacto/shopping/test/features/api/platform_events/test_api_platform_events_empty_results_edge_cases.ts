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

/**
 * Test platform events API with empty result edge cases.
 * Validate that the API handles no matching results gracefully with proper
 * pagination metadata and empty data array.
 */
export async function test_api_platform_events_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Generate unique event type that doesn't exist
  const nonExistentEventType = `nonexistent_${RandomGenerator.alphaNumeric(10)}`;
  // 3. Generate future date range (no events expected)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const futureDateRange = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 60,
  ).toISOString();
  // 4. Test case 1: Non-existent event type
  const response1 =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: nonExistentEventType,
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(response1);
  // Validate empty results
  TestValidator.equals(
    "empty data array for non-existent type",
    response1.data.length,
    0,
  );
  TestValidator.equals("current page correct", response1.pagination.current, 1);
  TestValidator.equals("limit preserved", response1.pagination.limit, 10);
  TestValidator.equals("zero records", response1.pagination.records, 0);
  TestValidator.equals("zero pages", response1.pagination.pages, 0);
  // 5. Test case 2: Future date range
  const response2 =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          date_from: futureDate,
          date_to: futureDateRange,
          limit: 5,
          page: 1,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("empty data for future dates", response2.data.length, 0);
  TestValidator.equals("limit applied", response2.pagination.limit, 5);
  TestValidator.equals("no records in future", response2.pagination.records, 0);
  // 6. Test case 3: Pagination beyond available results
  const response3 =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: nonExistentEventType,
          page: 10,
          limit: 20,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("empty data for high page", response3.data.length, 0);
  TestValidator.equals(
    "current page should be 1 for no results",
    response3.pagination.current,
    1,
  );
  // 7. Test case 4: Search term that doesn't match anything
  const response4 =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.alphaNumeric(50), // Long unique string
          limit: 15,
          page: 1,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "empty data for unique search",
    response4.data.length,
    0,
  );
  TestValidator.equals(
    "limit preserved in search",
    response4.pagination.limit,
    15,
  );
  // 8. Test case 5: Null handling for optional fields
  const response5 =
    await api.functional.ecommerce.administrator.platform_events.index(
      adminConnection,
      {
        body: {
          event_type: null,
          event_severity: null,
          event_source: null,
          search: null,
          date_from: null,
          date_to: null,
          limit: 10,
          page: 1,
        } satisfies IEcommercePlatformEvent.IRequest,
      },
    );
  typia.assert(response5);
  // API should handle null values gracefully
  TestValidator.predicate(
    "handles null filter values",
    response5.pagination.current === 1 && response5.pagination.limit === 10,
  );
}
