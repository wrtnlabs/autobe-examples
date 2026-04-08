import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test shipment creation with multiple order items bundled into a single shipment.
 *
 * Validates the complete shipment creation flow where a seller bundles multiple order items from the same order into a single physical package. This test ensures that the shipment API correctly handles multiple order items, updates their status from 'paid' to 'shipped', and returns complete shipment information with all relations.
 *
 * The test scenario simulates a real-world e-commerce flow: seller registers and gets approved, creates products with variants, customer registers and places an order with multiple items, and seller creates a bundled shipment for all items.
 *
 * 1. Seller registers and logs in to the platform.
 * 2. Seller creates a product with multiple variants for ordering.
 * 3. Customer registers and logs in to the platform.
 * 4. Customer adds multiple items (different variants) to cart.
 * 5. Customer places an order creating order items in 'paid' status.
 * 6. Seller creates a shipment bundling all order items from the same order.
 * 7. Validates shipment is created with correct carrier_name and tracking_number.
 * 8. Validates all order items transition to 'shipped' status and reference the shipment.
 */
export async function test_api_shipment_creation_multiple_items_bundled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Create product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Create multiple variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-001",
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: "SKU-002",
          option_values: "Color: Blue, Size: Medium",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 3. Customer setup - register and login
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.ILogin,
  });
  // 4. Customer adds multiple items to cart
  const cartItem1 =
    await generate_random_shopping_mall_member_cart_items_create(
      customerLoginConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      customerLoginConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 5. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Get order items from the order
  const orderItemIds = order.orderItems.map((item) => item.id);
  TestValidator.predicate("order has multiple items", orderItemIds.length >= 2);
  // Validate all order items are in 'paid' status before shipment
  for (const orderItem of order.orderItems) {
    TestValidator.equals(
      "order item status is paid before shipment",
      orderItem.status,
      "paid",
    );
  }
  // 6. Seller creates shipment bundling all order items
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: orderItemIds,
          carrier_name: "FedEx",
          tracking_number: typia
            .random<string & tags.Format<"uuid">>()
            .replace(/-/g, "")
            .substring(0, 12),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 7. Validate shipment details
  TestValidator.equals("carrier name matches", shipment.carrier_name, "FedEx");
  TestValidator.predicate("shipped_at is set", shipment.shipped_at !== null);
  // 8. Validate all order items are in the shipment
  TestValidator.equals(
    "shipment contains all order items",
    shipment.orderItems.length,
    orderItemIds.length,
  );
  // 9. Validate all order items reference the shipment and have 'shipped' status
  for (const orderItem of shipment.orderItems) {
    TestValidator.equals(
      "order item status is shipped",
      orderItem.status,
      "shipped",
    );
    TestValidator.equals(
      "shipment ID matches",
      orderItem.shipment!.id,
      shipment.id,
    );
  }
}
