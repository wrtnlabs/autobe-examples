import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller ownership enforcement when accessing cancellation requests.
 *
 * Validates that sellers can only access cancellation requests for products
 * they own. A seller attempting to access another seller's cancellation request
 * should receive an authorization error (403 Forbidden or 404 Not Found).
 */
export async function test_api_cancellation_request_seller_ownership_enforced(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Seller A (the seller who will attempt unauthorized access)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `Shop A ${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(sellerA);
  // Step 2: Create Seller B (owns the product that will be cancelled)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: `Shop B ${RandomGenerator.alphaNumeric(4)}`,
    },
  });
  typia.assert(sellerB);
  // Step 3: Create Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Step 4: Seller B creates a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: `Test Product ${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Step 5: Customer places an order
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: typia.random<IShoppingMallOrder.ICreate>(),
    },
  );
  typia.assert(order);
  // Find the order item from Seller B
  const orderItems = order.orderItems.filter(
    (item) => item.seller.id === sellerB.id,
  );
  TestValidator.predicate(
    "order contains at least one item from Seller B",
    orderItems.length > 0,
  );
  const targetOrderItem = orderItems[0];
  // Step 6: Customer creates a cancellation request for Seller B's product
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: targetOrderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Step 7: Seller A attempts to retrieve the cancellation request
  // This should fail because Seller A does not own the product
  await TestValidator.error(
    "Seller A cannot access Seller B's cancellation request",
    async () => {
      await api.functional.shoppingMall.seller.cancellation_requests.at(
        sellerAConnection,
        {
          cancellationRequestId: cancellationRequest.id,
        },
      );
    },
  );
}
