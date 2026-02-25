import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_order_items_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_customer_cancellation_request_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup two customers and one seller and a product with variant
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer2Connection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // Join customer 1 (owner)
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(customer1);
  // Join customer 2 (non-owner)
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    },
  });
  typia.assert(customer2);
  // Join seller
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // Create a product for seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Prepare order creation data for customer 1
  const orderCreateBody = {
    orderItems: [
      {
        shoppingMallProductVariantId: variant.id,
        quantity: 1,
        status: "paid",
        shoppingMallOrderId: "00000000-0000-0000-0000-000000000000"
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  // Create order and order item by customer 1
  const order = await generate_random_shopping_mall_customer_orders_create(
    customer1Connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(order);
  // Customer 1 fetches created order item ID
  const orderItemId = order.orderItems[0].id;
  // Attempt cancellation request by customer 1 (owner) - expect success
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customer1Connection,
      {
        body: {
          shoppingMallCustomerId: customer1.id,
          shoppingMallOrderItemId: orderItemId,
          reason: "Changed my mind",
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "Cancellation request customer ID should match owner",
    cancellationRequest.shoppingMallCustomerId,
    customer1.id,
  );
  TestValidator.equals(
    "Cancellation request order item ID should match",
    cancellationRequest.shoppingMallOrderItemId,
    orderItemId,
  );
  // Attempt cancellation request by customer 2 (non-owner) - expect failure
  await TestValidator.error(
    "Cancellation request creation denied for non-owner",
    async () => {
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customer2Connection,
        {
          body: {
            shoppingMallCustomerId: customer2.id,
            shoppingMallOrderItemId: orderItemId,
            reason: "I should not be able to cancel",
          },
        },
      );
    },
  );
}
