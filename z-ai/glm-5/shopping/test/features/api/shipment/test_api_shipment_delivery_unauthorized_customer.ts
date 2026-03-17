import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_seller_shipments_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test authorization enforcement when a different customer attempts to confirm
 * delivery of another customer's shipment.
 *
 * Setup:
 * 1. Customer A joins, creates shipping address, checks out creating order with paid items
 * 2. Seller joins, creates product and variant
 * 3. Seller creates shipment for Customer A's order items (items now 'shipped' status)
 * 4. Customer B joins as a separate authenticated user
 *
 * Test: Customer B attempts to call confirm-delivery endpoint using Customer A's shipmentId
 * Expected: 403 Forbidden error
 */
export async function test_api_shipment_delivery_unauthorized_customer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller setup - authenticate and create product/variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // Step 2: Customer A setup - authenticate, create address, checkout
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerAConnection,
    {},
  );
  typia.assert(address);
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerAConnection,
    {
      body: { addressId: address.id },
    },
  );
  typia.assert(order);
  // Step 3: Seller creates shipment for Customer A's order items
  const paidOrderItemIds = order.orderItems
    .filter((item) => item.status === "paid")
    .map((item) => item.id);
  TestValidator.predicate(
    "order should have paid items",
    paidOrderItemIds.length > 0,
  );
  const shipment =
    await generate_random_shopping_mall_seller_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: RandomGenerator.name(),
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderId: order.id,
          orderItemIds: paidOrderItemIds,
        },
      },
    );
  typia.assert(shipment);
  // Verify shipment is created and delivered_at is null
  TestValidator.equals(
    "shipment delivered_at should be null",
    shipment.deliveredAt,
    null,
  );
  // Step 4: Customer B setup - authenticate as a different user
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // Step 5: Customer B attempts to confirm delivery of Customer A's shipment
  // This should result in 403 Forbidden
  await TestValidator.httpError(
    "Customer B cannot confirm Customer A's shipment",
    403,
    async () =>
      await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        { shipmentId: shipment.id },
      ),
  );
}
