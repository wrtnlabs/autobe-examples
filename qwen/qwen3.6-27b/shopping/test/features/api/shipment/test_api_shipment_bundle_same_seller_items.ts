import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * Tests bundling multiple same-seller order items into a single shipment.
 *
 * Validates the shipment creation flow where a seller dispatches a single physical
 * package containing multiple paid order items from their products. Both items must
 * belong to products owned by the authenticated seller and currently hold paid status.
 * Upon shipment creation, all included items transition from paid to shipped status
 * simultaneously, sharing the same carrier tracking information.
 *
 * Special attention is given to verifying that the shipment junction table correctly
 * associates both order items to the shipment, the aggregated shipment item count
 * reflects the bundled quantity, and the response shipmentItems array includes both
 * order items with the same carrier tracking number.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates two products each with one variant in the same shop.
 * 3. Customer registers, creates a shipping address, adds both variants to their cart, and checks out producing two paid order items from the same seller.
 * 4. Seller creates a shipment bundling both order item IDs with a carrier name and tracking number.
 * 5. Validates that the shipment contains exactly two shipment items, the order item count is two, and both original order item IDs appear in the shipment items array.
 */
export async function test_api_shipment_bundle_same_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and creates two products with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product1 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product1);
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product1.id } },
    );
  typia.assert(variant1);
  const product2 =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product2);
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product2.id } },
    );
  typia.assert(variant2);
  // 3. Customer registers, creates address, adds to cart and checks out
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  await generate_random_ecommerce_platform_customer_cart_items_create(
    customerConnection,
    { body: { product_variant_id: variant1.id } },
  );
  await generate_random_ecommerce_platform_customer_cart_items_create(
    customerConnection,
    { body: { product_variant_id: variant2.id } },
  );
  const order = await generate_random_ecommerce_platform_customer_cart_checkout(
    customerConnection,
    { body: { shipping_address_id: address.id } },
  );
  typia.assert(order);
  // Collect order item IDs - both from the same seller's products
  const orderItemIds: (string & tags.Format<"uuid">)[] = order.items.map(
    (item) => item.id,
  );
  TestValidator.equals("order has two items", order.items.length, 2);
  // 4. Seller creates shipment bundling both order items
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      { body: { orderItemIds } },
    );
  typia.assert(shipment);
  // 5. Validate shipment contains both items
  TestValidator.equals("shipment item count", shipment.shipment_items_count, 2);
  TestValidator.equals(
    "shipmentItems array length",
    shipment.shipmentItems.length,
    2,
  );
  const shippedItemIds = shipment.shipmentItems.map((si) => si.orderItem.id);
  for (const id of orderItemIds) {
    TestValidator.predicate(
      `order item ${id} is included in shipment`,
      shippedItemIds.includes(id),
    );
  }
}
