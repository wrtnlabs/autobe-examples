import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_shipments_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_shipment } from "../../../prepare/prepare_random_shopping_mall_order_shipment";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test shipment creation bundling multiple order items from the same seller.
 *
 * This test validates that sellers can optimize shipping costs by bundling
 * multiple items into a single package with one tracking number.
 *
 * Test Flow:
 * 1. Admin approves seller account
 * 2. Seller creates a product with multiple variants
 * 3. Seller adds inventory to each variant
 * 4. Customer registers and adds multiple variants to cart
 * 5. Customer places an order creating multiple order items
 * 6. Seller creates ONE shipment bundling ALL selected items
 *
 * Validation Points:
 * - Single shipment record is created for all bundled items
 * - Shipment has correct carrier name and tracking number
 * - shipped_at timestamp is set
 * - Seller reference is correct
 */
export async function test_api_shipment_creation_multiple_items_bundle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Seller registration (pending status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // Step 3: Admin approves seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: pendingSeller.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Step 4: Seller login after approval to get fresh session
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 5: Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 6: Seller creates multiple variants (3 different color/size combinations)
  const variants = await ArrayUtil.asyncRepeat(3, async (index) => {
    const colors = ["Red", "Blue", "Green"] as const;
    const sizes = ["S", "M", "L"] as const;
    return await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
          price: (index + 1) * 10000,
          optionValues: [
            {
              key: "color",
              value: colors[index],
            } satisfies IShoppingMallProductVariantOption.ICreate,
            {
              key: "size",
              value: sizes[index],
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
          stockQuantity: 10,
        },
      },
    );
  });
  // Step 7: Seller adds more inventory to ensure sufficient stock
  await ArrayUtil.asyncForEach(variants, async (variant) => {
    const inventory =
      await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
        sellerConnection,
        {
          params: { variantId: variant.id },
          body: {
            quantity: 50,
            reason: "Additional stock for bundled shipment test",
          },
        },
      );
    typia.assert(inventory);
  });
  // Step 8: Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 9: Customer adds all variants to cart
  await ArrayUtil.asyncForEach(variants, async (variant) => {
    const cartItem = await generate_random_shopping_mall_customer_cart_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
    typia.assert(cartItem);
  });
  // Step 10: Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Validate order structure
  TestValidator.equals(
    "order has correct item count",
    order.orderItems.length,
    variants.length,
  );
  TestValidator.predicate("all items have paid status", () =>
    order.orderItems.every((item) => item.status === "paid"),
  );
  // Step 11: Seller creates shipment bundling all order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const carrierName = "FedEx";
  const trackingNumber = `FDX-${RandomGenerator.alphaNumeric(12)}`;
  const shipment =
    await generate_random_shopping_mall_seller_sellers_me_shipments_create(
      sellerConnection,
      {
        body: {
          orderItemIds,
          carrierName,
          trackingNumber,
        },
      },
    );
  typia.assert(shipment);
  // Step 12: Validate shipment
  TestValidator.equals(
    "carrier name matches",
    shipment.carrier_name,
    carrierName,
  );
  TestValidator.equals(
    "tracking number matches",
    shipment.tracking_number,
    trackingNumber,
  );
  TestValidator.equals(
    "delivered_at is null initially",
    shipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "seller reference is correct",
    shipment.seller.id,
    pendingSeller.id,
  );
}
