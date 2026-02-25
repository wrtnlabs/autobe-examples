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

export async function test_api_customer_cancellation_request_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customer);
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { base_price: 10000 } },
  );
  typia.assert(product);
  // 4. Seller adds a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      { params: { productId: product.id }, body: { stockQuantity: 50 } },
    );
  typia.assert(variant);
  // 5. Customer creates an order with order item in 'paid' status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        orderItems: [{ quantity: 2, shoppingMallProductVariantId: variant.id }],
      },
    },
  );
  typia.assert(order);
  const orderItemPaid =
    await generate_random_shopping_mall_customer_order_items_create(
      customerConnection,
      {
        body: {
          shoppingMallOrderId: order.id,
          shoppingMallProductVariantId: variant.id,
          quantity: 2,
          status: "paid",
        },
      },
    );
  typia.assert(orderItemPaid);
  // 6. Customer creates a cancellation request for the order item
  const reason = `Cancellation reason - ${RandomGenerator.content({ paragraphs: 1 })}`;
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shoppingMallCustomerId: customer.id,
          shoppingMallOrderItemId: orderItemPaid.id,
          reason: reason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // 7. Validate cancellation request fields
  TestValidator.equals(
    "customer ID matches",
    cancellationRequest.shoppingMallCustomerId,
    customer.id,
  );
  TestValidator.equals(
    "order item ID matches",
    cancellationRequest.shoppingMallOrderItemId,
    orderItemPaid.id,
  );
  TestValidator.equals("reason matches", cancellationRequest.reason, reason);
  TestValidator.equals(
    "seller approval status is pending",
    cancellationRequest.sellerApprovalStatus,
    "pending",
  );
  TestValidator.predicate(
    "requestedAt is set",
    cancellationRequest.requestedAt !== undefined &&
      cancellationRequest.requestedAt !== null,
  );
  TestValidator.equals(
    "customer summary id matches",
    cancellationRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "order item summary id matches",
    cancellationRequest.orderItem.id,
    orderItemPaid.id,
  );
}
