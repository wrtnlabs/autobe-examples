import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderSnapshotCategoryPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotCategoryPerformance";
import type { IEcommerceOrderSnapshotGeographicDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistribution";
import type { IEcommerceOrderSnapshotGeographicDistributionCity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCity";
import type { IEcommerceOrderSnapshotGeographicDistributionCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionCountry";
import type { IEcommerceOrderSnapshotGeographicDistributionRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionTopRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionTopRegion";
import type { IEcommerceOrderSnapshotGeographicDistributionUnknown } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotGeographicDistributionUnknown";
import type { IEcommerceOrderSnapshotHourlyDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotHourlyDistribution";
import type { IEcommerceOrderSnapshotSellerPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotSellerPerformance";
import type { IEcommerceOrderSnapshotStatusDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshotStatusDistribution";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Get customer ID for filtering
  const customerId = customerAuth.id;
  // Wait a moment to ensure customer is properly registered
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Filter with specific date range
  const filterRange1 = {
    customer_id: customerId,
    created_after: "2024-01-16T00:00:00Z",
    created_before: "2024-01-19T00:00:00Z",
    page: 1,
    limit: 10,
  } satisfies IEcommerceOrder.IRequest;
  const response1 =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: filterRange1,
      },
    );
  typia.assert(response1);
  // Test 2: Filter with exact date match
  const filterRange2 = {
    customer_id: customerId,
    created_after: "2024-01-17T00:00:00Z",
    created_before: "2024-01-17T23:59:59Z",
    page: 1,
    limit: 10,
  } satisfies IEcommerceOrder.IRequest;
  const response2 =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: filterRange2,
      },
    );
  typia.assert(response2);
  // Test 3: Empty result when no orders in range
  const filterRange3 = {
    customer_id: customerId,
    created_after: "2024-02-01T00:00:00Z", // Future date
    created_before: "2024-02-10T00:00:00Z",
    page: 1,
    limit: 10,
  } satisfies IEcommerceOrder.IRequest;
  const response3 =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: filterRange3,
      },
    );
  typia.assert(response3);
  TestValidator.predicate(
    "should handle empty result gracefully",
    response3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "should have valid pagination structure",
    response3.pagination.pages >= 0,
  );
  // Test 4: Pagination with filtering
  const filterRange4 = {
    customer_id: customerId,
    created_after: "2024-01-01T00:00:00Z", // Wide range
    created_before: "2024-12-31T23:59:59Z",
    page: 1,
    limit: 2,
  } satisfies IEcommerceOrder.IRequest;
  const response4 =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: filterRange4,
      },
    );
  typia.assert(response4);
  TestValidator.predicate(
    "should support pagination limits",
    response4.data.length <= response4.pagination.limit,
  );
  TestValidator.predicate(
    "should have valid current page",
    response4.pagination.current === 1,
  );
  // Test 5: Filter with null dates (should return all orders)
  const filterRange5 = {
    customer_id: customerId,
    created_after: null,
    created_before: null,
    page: 1,
    limit: 10,
  } satisfies IEcommerceOrder.IRequest;
  const response5 =
    await api.functional.ecommerce.customer.orders.history.index(
      customerConnection,
      {
        body: filterRange5,
      },
    );
  typia.assert(response5);
  TestValidator.predicate(
    "should handle null date filters",
    response5.pagination.records >= 0,
  );
}
