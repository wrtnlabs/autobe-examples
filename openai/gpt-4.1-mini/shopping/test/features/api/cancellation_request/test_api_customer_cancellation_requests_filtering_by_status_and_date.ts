import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_customer_cancellation_requests_filtering_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test filtering cancellation requests by seller approval status and requested date range.
  // The customer filters cancellation requests by seller_approval_status and requestedAtFrom/to date ranges.
  // Validate only matched requests are returned with correct pagination metadata.
  // Confirm empty results handled gracefully.
  // 1. Customer joins and obtains authorization tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create two orders for the customer
  const order1 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: {} },
  );
  typia.assert(order1);
  const order2 = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    { body: {} },
  );
  typia.assert(order2);
  // 3. Create order items for the orders
  const item1 = await generate_random_shopping_mall_customer_order_items_create(
    customerConnection,
    {
      body: {
        shoppingMallOrderId: order1.id,
        shoppingMallProductVariantId: typia.random<
          string & typia.tags.Format<"uuid">
        >(),
        quantity: 1,
        status: "paid",
      },
    },
  );
  typia.assert(item1);
  const item2 = await generate_random_shopping_mall_customer_order_items_create(
    customerConnection,
    {
      body: {
        shoppingMallOrderId: order2.id,
        shoppingMallProductVariantId: typia.random<
          string & typia.tags.Format<"uuid">
        >(),
        quantity: 2,
        status: "paid",
      },
    },
  );
  typia.assert(item2);
  // 4. We cannot create cancellation requests via available API, so assume cancellation requests exist with varied sellerApprovalStatus and requestedAt values for the customer and items
  // 5. Define filters: sellerApprovalStatus and requestedAt range
  const statusFilter = "pending";
  const now = new Date();
  const requestedFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const requestedTo = now.toISOString();
  // 6. Search cancellation requests with filters
  const response =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: authorized.id,
          sellerApprovalStatus: statusFilter,
          requestedAtFrom: requestedFrom,
          requestedAtTo: requestedTo,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 7. Validate all records match filters and belong to the authorized customer
  for (const cancellationRequest of response.data) {
    TestValidator.equals(
      "customer id matches",
      cancellationRequest.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "seller approval status matches",
      cancellationRequest.sellerApprovalStatus,
      statusFilter,
    );
    TestValidator.predicate(
      "requestedAt within range",
      new Date(cancellationRequest.requestedAt).getTime() >=
        new Date(requestedFrom).getTime() &&
        new Date(cancellationRequest.requestedAt).getTime() <=
          new Date(requestedTo).getTime(),
    );
  }
  // 8. Validate pagination
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "pagination pages non-negative and sufficient",
    pagination.pages >= 0 &&
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // 9. Test empty response when filters yield no results
  const emptyResponse =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: authorized.id,
          sellerApprovalStatus: "approved", // assuming no 'approved' cancellation requests exist
          requestedAtFrom: new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(), // future
          requestedAtTo: new Date(
            now.getTime() + 2 * 24 * 60 * 60 * 1000,
          ).toISOString(), // future
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "empty data array when no match",
    emptyResponse.data.length === 0,
  );
}
