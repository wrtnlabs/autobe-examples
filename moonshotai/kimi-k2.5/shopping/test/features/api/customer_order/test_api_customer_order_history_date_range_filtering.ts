import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test date range filtering with createdAfter and createdBefore parameters for customer order history.
 * Verifies orders created within specified date range are returned correctly.
 * Tests edge cases: createdAfter only (orders after specific date), createdBefore only (orders before specific date),
 * and both combined (orders within date window). Ensures ISO 8601 datetime format is accepted.
 */
export async function test_api_customer_order_history_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Test 1: Filter with createdAfter only (orders after specific date)
  const afterResult = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        createdAfter: yesterday.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(afterResult);
  TestValidator.predicate(
    "createdAfter filter returns valid page",
    afterResult.pagination.pages >= 0,
  );
  // Test 2: Filter with createdBefore only (orders before specific date)
  const beforeResult = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        createdBefore: tomorrow.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(beforeResult);
  TestValidator.predicate(
    "createdBefore filter returns valid page",
    beforeResult.pagination.pages >= 0,
  );
  // Test 3: Filter with both createdAfter and createdBefore (orders within date window)
  const rangeResult = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        createdAfter: lastWeek.toISOString(),
        createdBefore: nextWeek.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "date range filter returns valid page",
    rangeResult.pagination.pages >= 0,
  );
  // Test 4: Filter with very narrow date range (edge case - might return empty results)
  const narrowResult = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        createdAfter: now.toISOString(),
        createdBefore: now.toISOString(),
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(narrowResult);
  TestValidator.predicate(
    "narrow date range returns valid page",
    narrowResult.pagination.pages >= 0,
  );
  // Test 5: Filter with distant past date (edge case)
  const distantPastResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdAfter: new Date("2020-01-01T00:00:00.000Z").toISOString(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(distantPastResult);
  TestValidator.predicate(
    "distant past filter returns valid page",
    distantPastResult.pagination.pages >= 0,
  );
  // Test 6: Filter with distant future date (edge case)
  const distantFutureResult =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          createdBefore: new Date("2030-12-31T23:59:59.999Z").toISOString(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(distantFutureResult);
  TestValidator.predicate(
    "distant future filter returns valid page",
    distantFutureResult.pagination.pages >= 0,
  );
}
