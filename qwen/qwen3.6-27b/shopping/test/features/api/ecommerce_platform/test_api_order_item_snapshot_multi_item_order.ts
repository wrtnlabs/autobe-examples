import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
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
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
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
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test that each order item in a multi-item order maintains its own independent snapshot with correct transactional values.
 *
 * Validates that order item snapshots correctly capture the exact quantity and unit price for each line item,
 * even when an order contains multiple different product variants with distinct pricing.
 *
 * The test creates a multi-item order containing two variants—one priced at $30 with quantity 2,
 * and another priced at $75 with quantity 1—then validates the snapshot for the higher-priced item shows
 * quantity 1 and unit_price $75.00, confirming that snapshots are item-specific and maintain
 * independent records rather than conflated order-level data.
 *
 * 1. Administrator creates a product category.
 * 2. Seller registers and creates a product in that category.
 * 3. Seller creates two product variants with different prices (Variant A: $30, Variant B: $75).
 * 4. Customer registers and creates a shipping address.
 * 5. Customer creates an order containing both variants with the specified quantities.
 * 6. Retrieve a snapshot for the order item containing Variant B.
 * 7. Validates snapshot has entity_type 'order_item', quantity 1, unit_price 75.00,
 *    confirming snapshots maintain independent per-item transactional values.
 */
export async function test_api_order_item_snapshot_multi_item_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller creates product and two variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // Create Variant A with price $30
  const variantA: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { price: 30 },
      },
    );
  typia.assert(variantA);
  // Create Variant B with price $75
  const variantB: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { price: 75 },
      },
    );
  typia.assert(variantB);
  // 3. Customer creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const shippingAddress: IEcommercePlatformShippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 4. Customer creates order with multiple items
  const orderItemVariantA: IEcommercePlatformOrderItem.ICreate = {
    ecommerce_platform_product_variant_id: variantA.id,
    quantity: 2,
    price: 30,
  } satisfies IEcommercePlatformOrderItem.ICreate;
  const orderItemVariantB: IEcommercePlatformOrderItem.ICreate = {
    ecommerce_platform_product_variant_id: variantB.id,
    quantity: 1,
    price: 75,
  } satisfies IEcommercePlatformOrderItem.ICreate;
  const order: IEcommercePlatformOrder =
    await generate_random_ecommerce_platform_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [orderItemVariantA, orderItemVariantB],
          shipping_address_id: shippingAddress.id,
        } satisfies IEcommercePlatformOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Get the order item containing Variant B (second item)
  const orderItemForVariantB = order.items.find(
    (item) => item.productVariant.id === variantB.id,
  );
  typia.assertGuard(orderItemForVariantB!);
  // 6. Retrieve snapshot for the order item
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot: IEcommercePlatformSnapshotOrderItem =
    await api.functional.ecommercePlatform.customer.orders.items.snapshots.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItemForVariantB.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot values match the order item for Variant B
  TestValidator.equals(
    "entity type is order_item",
    snapshot.entity_type,
    "order_item",
  );
  TestValidator.equals(
    "snapshot quantity matches Variant B quantity (1, not 2)",
    snapshot.quantity,
    1,
  );
  TestValidator.equals(
    "snapshot unit price matches Variant B price (75, not 30)",
    snapshot.unit_price,
    75,
  );
}
