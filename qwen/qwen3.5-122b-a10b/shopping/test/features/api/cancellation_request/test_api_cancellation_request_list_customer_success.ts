import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";

/**
 * Customer successfully retrieves cancellation requests for their own order item.
 *
 * This test validates the list endpoint's basic functionality:
 * 1. Customer registers and authenticates
 * 2. Customer creates an order with order items in 'paid' status
 * 3. Customer calls the list endpoint with the orderItemId
 * 4. Validates the response structure and pagination metadata
 * 5. Validates empty list when no cancellation requests exist
 */
export async function test_api_cancellation_request_list_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create order with order items in 'paid' status
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: RandomGenerator.paragraph({ sentences: 2 }),
        shipping_city: RandomGenerator.alphabets(10),
        shipping_state: RandomGenerator.alphabets(8),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: RandomGenerator.alphabets(15),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item (must be in 'paid' status to request cancellation)
  const orderItem = order.order_items[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 3. Retrieve cancellation request list for the order item
  // Note: This tests the list endpoint's basic functionality
  // Without a create endpoint available, we validate the empty list case
  const result =
    await api.functional.ecommerceMall.customer.order_items.cancellation_requests.index(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages", result.pagination.pages >= 0);
  // 5. Validate empty data array (no cancellation requests exist yet)
  TestValidator.equals("no cancellation requests yet", result.data.length, 0);
  // 6. Validate response type structure
  // typia.assert ensures all required fields exist with correct types:
  // - id, orderItemId, status, requestedAt, respondedAt, createdAt for each item
  // - orderItem reference with proper structure
  // - pagination metadata
  // This validates the type safety of the response
}
