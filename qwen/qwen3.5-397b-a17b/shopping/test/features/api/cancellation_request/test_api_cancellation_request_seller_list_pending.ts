import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can retrieve a filtered list of pending cancellation requests
 * for order items from their products.
 *
 * **Setup Prerequisites:**
 * 1. Register and authenticate a seller account
 * 2. Seller creates a product with at least one variant
 * 3. Register and authenticate a customer account
 * 4. Customer creates an order containing the seller's product variant with paid status
 * 5. Customer creates a cancellation request for the order item with reason
 *
 * **Test Execution:**
 * 1. Seller calls PATCH /shoppingMall/seller/cancellation-requests with status filter set to 'pending'
 * 2. Verify the response contains the cancellation request created by the customer
 * 3. Verify the response includes correct customer information (id, email, profile)
 * 4. Verify the response includes correct order item information (id, quantity, price, status, product, productVariant, seller)
 * 5. Verify the cancellation request shows correct reason and status (pending)
 * 6. Verify pagination metadata is correct (current page, limit, total records, total pages)
 *
 * **Business Logic Validation:**
 * - Seller can only see cancellation requests for order items from their own products
 * - Response includes all required fields: id, reason, status, created_at, customer, orderItem
 * - Status filter correctly returns only pending requests
 * - Default sorting by created_at DESC is applied
 */
export async function test_api_cancellation_request_seller_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product - use generation function that handles category internally
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Register and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Customer creates an order - generation function handles address internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 6. Get the first order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate(
    "order has at least one item",
    () => order.orderItems.length > 0,
  );
  typia.assert(orderItem);
  // 7. Customer creates a cancellation request for the order item with reason
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: cancellationReason,
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 8. Seller calls PATCH /shoppingMall/seller/cancellation-requests with status filter set to 'pending'
  const result =
    await api.functional.shoppingMall.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(result);
  // 9. Verify the response contains the cancellation request created by the customer
  TestValidator.predicate(
    "cancellation request exists in results",
    () => result.data.length > 0,
  );
  const foundRequest = result.data.find(
    (req) => req.id === cancellationRequest.id,
  );
  TestValidator.predicate(
    "created cancellation request is found",
    () => foundRequest !== undefined,
  );
  if (foundRequest) {
    // 10. Verify the response includes correct customer information
    TestValidator.equals(
      "customer id matches",
      foundRequest.customer.id,
      customerAuth.id,
    );
    TestValidator.equals(
      "customer email matches",
      foundRequest.customer.email,
      customerAuth.email,
    );
    // 11. Verify the response includes correct order item information
    TestValidator.equals(
      "order item id matches",
      foundRequest.orderItem.id,
      orderItem.id,
    );
    TestValidator.equals(
      "order item quantity matches",
      foundRequest.orderItem.quantity,
      orderItem.quantity,
    );
    TestValidator.equals(
      "order item price matches",
      foundRequest.orderItem.price,
      orderItem.price,
    );
    TestValidator.equals(
      "order item status is paid",
      foundRequest.orderItem.status,
      "paid",
    );
    // 12. Verify the cancellation request shows correct reason and status
    TestValidator.equals(
      "cancellation reason matches",
      foundRequest.reason,
      cancellationReason,
    );
    TestValidator.equals(
      "cancellation status is pending",
      foundRequest.status,
      "pending",
    );
    // 13. Verify order item references correct seller
    TestValidator.equals(
      "order item seller id matches",
      foundRequest.orderItem.seller.id,
      sellerAuth.id,
    );
  }
  // 14. Verify pagination metadata is correct
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "total records is at least 1",
    () => result.pagination.records >= 1,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    () => result.pagination.pages >= 1,
  );
  // 15. Verify all returned requests have pending status (filter validation)
  result.data.forEach((req, index) => {
    TestValidator.equals(
      `request ${index} status is pending`,
      req.status,
      "pending",
    );
  });
}
