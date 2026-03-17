import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

export async function test_api_customer_order_history_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authResult);
  // Step 2: Create multiple orders via checkout to have test data
  const orderCreations = await ArrayUtil.asyncRepeat(5, async () => {
    const order = await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {},
      },
    );
    return order;
  });
  typia.assert(orderCreations);
  // Verify all created orders have 'paid' status (initial state after checkout)
  TestValidator.predicate(
    "all created orders should have paid status",
    orderCreations.every((order) => order.status === "paid"),
  );
  // Step 3: Test filtering by 'paid' status
  const paidOrdersResponse: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paidOrdersResponse);
  // Validate that filtered results contain at least the created orders
  TestValidator.predicate(
    "paid filter should return at least the created orders",
    paidOrdersResponse.pagination.records >= 5,
  );
  // Verify all returned orders have 'paid' status
  TestValidator.predicate(
    "all orders in paid filter result should have paid status",
    paidOrdersResponse.data.every((order) => order.status === "paid"),
  );
  // Step 4: Test without status filter (should return all orders including paid ones)
  const allOrdersResponse: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(allOrdersResponse);
  // Without filter should return same or more records than with paid filter
  TestValidator.predicate(
    "unfiltered results should include at least as many orders as paid filter",
    allOrdersResponse.pagination.records >=
      paidOrdersResponse.pagination.records,
  );
  // Step 5: Test pagination with status filter
  const paginatedPaidResponse: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(paginatedPaidResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination limit should be respected",
    paginatedPaidResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current should be 1",
    paginatedPaidResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "paginated data should not exceed limit",
    paginatedPaidResponse.data.length <= 2,
  );
  // Step 6: Test filtering by other statuses returns no results (since we only created paid orders)
  const statusesToTest = [
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ] as const;
  for (const status of statusesToTest) {
    const filteredResponse: IPageIEcommerceMallOrder.ISummary =
      await api.functional.ecommerceMall.customer.orders.index(
        customerConnection,
        {
          body: {
            status,
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrder.IRequest,
        },
      );
    typia.assert(filteredResponse);
    TestValidator.equals(
      `${status} filter should return 0 records for paid-only orders`,
      filteredResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      `${status} filter should return empty data array`,
      filteredResponse.data.length,
      0,
    );
  }
  // Step 7: Validate order summary structure
  const firstOrder = allOrdersResponse.data[0];
  if (firstOrder !== undefined) {
    typia.assert(firstOrder);
    // TestValidator.predicate validates business logic, not type structure
    // typia.assert already validates type structure
    TestValidator.equals(
      "order id should be non-empty string",
      firstOrder.id.length > 0,
      true,
    );
    TestValidator.equals(
      "order orderNumber should be non-empty string",
      firstOrder.orderNumber.length > 0,
      true,
    );
    TestValidator.predicate(
      "order totalPrice should be positive",
      firstOrder.totalPrice > 0,
    );
  }
  // Step 8: Test sorting (newest first by default)
  if (allOrdersResponse.data.length >= 2) {
    const firstOrderTime = new Date(
      allOrdersResponse.data[0].createdAt,
    ).getTime();
    const secondOrderTime = new Date(
      allOrdersResponse.data[1].createdAt,
    ).getTime();
    TestValidator.predicate(
      "orders should be sorted by newest first",
      firstOrderTime >= secondOrderTime,
    );
  }
}
