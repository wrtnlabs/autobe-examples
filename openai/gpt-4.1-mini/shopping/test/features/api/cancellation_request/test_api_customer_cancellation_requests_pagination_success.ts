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

export async function test_api_customer_cancellation_requests_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a paginated list of cancellation requests by authenticated customer
  // Step 1: Customer joins the platform to obtain authentication tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: { email: typia.random<string & tags.Format<"email">>() },
  });
  // Update customerConnection authorization header with access token
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: authorizedCustomer.token.access,
  };
  typia.assert(authorizedCustomer);
  // Step 2: Customer creates an order to link cancellation requests
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(order);
  // Step 3: Customer creates order items to be referenced in cancellation requests
  const orderItem =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: order.orderItems[0].productVariant.id,
          quantity: 1,
          status: "paid",
        },
      },
    );
  typia.assert(orderItem);
  // Step 4: Use the authenticated customer connection to request paginated cancellation requests index
  const cancellationRequestPage =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: authorizedCustomer.id,
          page: 1,
          limit: 10,
        },
      },
    );
  // Validate response structure and type
  typia.assert(cancellationRequestPage);
  // Validate pagination metadata
  const pagination = cancellationRequestPage.pagination;
  TestValidator.predicate(
    "page current is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("page limit is at least 1", pagination.limit >= 1);
  TestValidator.predicate(
    "page records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("page pages is non-negative", pagination.pages >= 0);
  // Validate that all returned cancellation requests belong to the authenticated customer
  for (const request of cancellationRequestPage.data) {
    TestValidator.equals(
      "cancellation request customer id matches authenticated customer",
      request.customer.id,
      authorizedCustomer.id,
    );
    // Validate required fields in each cancellation request summary
    typia.assert(request);
  }
}
