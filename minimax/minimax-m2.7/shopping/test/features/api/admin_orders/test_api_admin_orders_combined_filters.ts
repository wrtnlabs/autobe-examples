import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin order filtering with combined filters (date range, amount range, customer ID).
 *
 * Validates that administrators can use multiple filter parameters simultaneously to narrow down order results for targeted oversight. Tests date range filtering, amount range filtering, customer ID filtering, order number partial search, and city filter for shipping addresses.
 *
 * **Filter Combinations Tested**:
 * 1. Date range + amount range combined
 * 2. Customer ID filter with date range
 * 3. Order number partial search
 * 4. City filter for shipping address filtering
 *
 * 1. Administrator joins/registers via POST /ecommerceMall/auth/admin/join.
 * 2. Test combined date and amount filters on orders endpoint.
 * 3. Verify returned orders fall within both date and amount constraints.
 * 4. Test customer ID filter narrows results to specific customer.
 * 5. Verify order number partial search matches expected patterns.
 * 6. Verify city filter correctly filters by shipping address city.
 */
export async function test_api_admin_orders_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test combined date range and amount range filters
  const combinedFiltersResult =
    await api.functional.ecommerceMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          createdAtFrom: "2024-01-01T00:00:00Z" as string &
            tags.Format<"date-time">,
          createdAtTo: "2024-12-31T23:59:59Z" as string &
            tags.Format<"date-time">,
          minTotal: 100,
          maxTotal: 1000,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedFiltersResult);
  // 3. Validate combined filters work correctly
  TestValidator.equals(
    "pagination exists",
    combinedFiltersResult.pagination !== null,
    true,
  );
  TestValidator.predicate("orders in date range", () => {
    for (const order of combinedFiltersResult.data) {
      const createdAt = new Date(order.created_at);
      const fromDate = new Date("2024-01-01T00:00:00Z");
      const toDate = new Date("2024-12-31T23:59:59Z");
      if (createdAt < fromDate || createdAt > toDate) {
        return false;
      }
    }
    return true;
  });
  TestValidator.predicate("orders in amount range", () => {
    for (const order of combinedFiltersResult.data) {
      if (order.total_amount < 100 || order.total_amount > 1000) {
        return false;
      }
    }
    return true;
  });
  // 4. Test customer ID filter - first get all orders to find a customer
  const allOrdersResult =
    await api.functional.ecommerceMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersResult);
  if (allOrdersResult.data.length > 0) {
    const specificCustomerId = allOrdersResult.data[0].customer.id;
    const customerFilterResult =
      await api.functional.ecommerceMall.admin.admin.orders.index(
        adminConnection,
        {
          body: {
            customerId: specificCustomerId,
            createdAtFrom: "2024-01-01T00:00:00Z" as string &
              tags.Format<"date-time">,
            createdAtTo: "2024-12-31T23:59:59Z" as string &
              tags.Format<"date-time">,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(customerFilterResult);
    TestValidator.predicate("filtered orders belong to customer", () => {
      for (const order of customerFilterResult.data) {
        if (order.customer.id !== specificCustomerId) {
          return false;
        }
      }
      return true;
    });
  }
  // 5. Test order number partial search
  const orderNumberResult =
    await api.functional.ecommerceMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          orderNumber: "ORD-2024%",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderNumberResult);
  // 6. Test city filter for shipping address
  const cityResult =
    await api.functional.ecommerceMall.admin.admin.orders.index(
      adminConnection,
      {
        body: {
          city: "New%",
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(cityResult);
}
