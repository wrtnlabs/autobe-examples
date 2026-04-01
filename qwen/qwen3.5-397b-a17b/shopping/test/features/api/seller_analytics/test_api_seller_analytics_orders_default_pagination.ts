import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller order analytics retrieval with default pagination.
 *
 * This test validates that sellers can retrieve orders containing their products
 * through the analytics endpoint with proper pagination, order status derivation,
 * and customer information inclusion.
 *
 * Test Flow:
 * 1. Seller registration and authentication
 * 2. Seller creates a product
 * 3. Customer registration and authentication
 * 4. Customer places an order (system ensures valid cart/address)
 * 5. Seller retrieves order analytics with default pagination
 * 6. Validate response structure and data accuracy
 */
export async function test_api_seller_analytics_orders_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup - Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer Setup - Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Customer creates an order for the seller's product
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Seller retrieves order analytics with default pagination
  const analyticsResponse =
    await api.functional.shoppingMall.seller.analytics.orders.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    analyticsResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    analyticsResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    analyticsResponse.pagination.pages >= 1,
  );
  // 7. Validate order data exists
  TestValidator.predicate(
    "orders array not empty",
    analyticsResponse.data.length >= 1,
  );
  // 8. Validate order summary structure and content
  const sellerOrder = analyticsResponse.data.find((o) => o.id === order.id);
  TestValidator.predicate(
    "seller can see their order",
    sellerOrder !== undefined,
  );
  if (sellerOrder) {
    // Validate order summary fields
    TestValidator.equals("order id matches", sellerOrder.id, order.id);
    TestValidator.equals(
      "order number matches",
      sellerOrder.order_number,
      order.order_number,
    );
    TestValidator.equals(
      "ordered at matches",
      sellerOrder.ordered_at,
      order.ordered_at,
    );
    TestValidator.equals(
      "recipient name matches",
      sellerOrder.recipient_name,
      order.recipient_name,
    );
    TestValidator.equals(
      "order items count",
      sellerOrder.order_items_count,
      order.orderItems.length,
    );
    // Validate customer information is included
    TestValidator.equals(
      "customer id matches",
      sellerOrder.customer.id,
      customerAuth.id,
    );
    TestValidator.equals(
      "customer email matches",
      sellerOrder.customer.email,
      customerAuth.email,
    );
    TestValidator.predicate(
      "customer profile exists",
      sellerOrder.customer.profile !== null,
    );
    // Validate total amount calculation
    const expectedTotal = order.orderItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    TestValidator.equals(
      "total amount accurate",
      sellerOrder.total_amount,
      expectedTotal,
    );
    // Validate order status (should be 'paid' for new orders)
    TestValidator.predicate(
      "order status is valid",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        sellerOrder.status,
      ),
    );
  }
}
