import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of shipment items from a multi-seller order.
 *
 * This test validates that administrators can access shipment items from orders
 * containing products from multiple sellers. The workflow includes:
 * 1. Admin, customer, and two sellers authentication
 * 2. Each seller creates a product with variant
 * 3. Customer adds both variants to cart and places single order
 * 4. Each seller creates separate shipment for their items
 * 5. Admin retrieves shipment items from both shipments
 */
export async function test_api_admin_shipment_item_multi_seller_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 3. Seller A authentication and product creation
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAAuth);
  // Seller A creates product
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    { body: {} },
  );
  typia.assert(productA);
  // Seller A creates variant
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          sku_code: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            },
          ],
        },
      },
    );
  typia.assert(variantA);
  // 4. Seller B authentication and product creation
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph(),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerBAuth);
  // Seller B creates product
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    { body: {} },
  );
  typia.assert(productB);
  // Seller B creates variant
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          sku_code: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "size",
              value: "Large",
            },
          ],
        },
      },
    );
  typia.assert(variantB);
  // 5. Customer adds both variants to cart
  const cartItemA =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantA.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantB.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        },
      },
    );
  typia.assert(cartItemB);
  // 6. Customer places order with both items
  // Note: Need to create a shipping address first (not shown in available APIs)
  // Using random UUID for addressId - in real test this would be a created address
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Verify order has items from both sellers
  TestValidator.predicate("order has 2 items", () => order.items.length === 2);
  // Identify which item belongs to which seller
  const sellerAItem = order.items.find(
    (item) => item.seller.id === sellerAAuth.id,
  );
  const sellerBItem = order.items.find(
    (item) => item.seller.id === sellerBAuth.id,
  );
  TestValidator.predicate(
    "Seller A item exists",
    () => sellerAItem !== undefined,
  );
  TestValidator.predicate(
    "Seller B item exists",
    () => sellerBItem !== undefined,
  );
  // 7. Seller A creates shipment for their item
  const shipmentA = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        order_item_ids: [sellerAItem!.id],
        tracking_carrier: "FedEx",
        tracking_number: `TRACK-A-${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipmentA);
  // 8. Seller B creates separate shipment for their item
  const shipmentB = await generate_random_shopping_mall_seller_shipments_create(
    sellerBConnection,
    {
      body: {
        order_item_ids: [sellerBItem!.id],
        tracking_carrier: "UPS",
        tracking_number: `TRACK-B-${RandomGenerator.alphaNumeric(12)}`,
      },
    },
  );
  typia.assert(shipmentB);
  // 9. Admin retrieves shipment items from both shipments
  const adminShipmentItemA =
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipmentA.id,
        itemId: sellerAItem!.id,
      },
    );
  typia.assert(adminShipmentItemA);
  const adminShipmentItemB =
    await api.functional.shoppingMall.admin.shipments.items.at(
      adminConnection,
      {
        shipmentId: shipmentB.id,
        itemId: sellerBItem!.id,
      },
    );
  typia.assert(adminShipmentItemB);
  // Validate admin can access both shipment items
  TestValidator.equals(
    "Shipment A item ID",
    adminShipmentItemA.orderItem.id,
    sellerAItem!.id,
  );
  TestValidator.equals(
    "Shipment B item ID",
    adminShipmentItemB.orderItem.id,
    sellerBItem!.id,
  );
  // Validate tracking information is independent
  TestValidator.equals(
    "Shipment A carrier",
    adminShipmentItemA.shipment.tracking_carrier,
    "FedEx",
  );
  TestValidator.equals(
    "Shipment B carrier",
    adminShipmentItemB.shipment.tracking_carrier,
    "UPS",
  );
  TestValidator.notEquals(
    "Tracking numbers differ",
    adminShipmentItemA.shipment.tracking_number,
    adminShipmentItemB.shipment.tracking_number,
  );
  // Validate sellers are different
  TestValidator.notEquals(
    "Different sellers",
    adminShipmentItemA.orderItem.seller.id,
    adminShipmentItemB.orderItem.seller.id,
  );
}
