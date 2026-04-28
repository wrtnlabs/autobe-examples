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
 * Test the primary purchase workflow and verify that order item snapshots capture correct transactional details at the moment of purchase.
 *
 * Validates the complete order creation flow including administrative product setup, seller product and variant creation with specific pricing, customer authentication, and order placement with quantity verification. Ensures that the snapshot correctly preserves the exact quantity ordered and unit price at purchase time.
 *
 * Special attention is given to verifying that the snapshot entity_type is correctly classified as 'order_item', the quantity exactly matches the ordered amount (3), and the unit_price matches the variant price at purchase time ($50.00). This confirms the snapshot preserves the exact transactional state from checkout.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller authenticates and creates a product with base price $50.
 * 3. Seller creates a product variant with price $50.
 * 4. Customer authenticates with a join operation.
 * 5. Customer creates a shipping address for delivery.
 * 6. Customer creates an order referencing the variant with quantity 3.
 * 7. Snapshot for the order item is retrieved using orderId, itemId, and snapshotId.
 * 8. Validates snapshot fields match expected transactional state.
 */
export async function test_api_order_item_snapshot_preservation_on_purchase(
  connection: api.IConnection,
) {
  // 1. Admin authentication and category setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin1234",
      href: "https://platform.test/admin/register",
      referrer: "https://platform.test/admin/register",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(category);
  // 2. Seller authentication and product setup with base price $50
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "Seller1234",
      href: "https://platform.test/seller/login",
      referrer: "https://platform.test/seller/login",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: 50,
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  // 3. Create product variant with price $50
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>()}`,
          price: 50,
          options: ArrayUtil.repeat(1, () => ({
            attributeKey: "color",
            attributeValue: "blue",
          })),
        },
      },
    );
  typia.assert(variant);
  // 4. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "Customer1234",
      href: "https://platform.test/customer/register",
      referrer: "https://platform.test/customer/register",
    },
  });
  // 5. Create shipping address for the customer
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.alphabets(6),
          state: RandomGenerator.alphabets(5),
          postalCode: typia.random<number & tags.Type<"uint32">>().toString(),
          country: RandomGenerator.alphabets(8),
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 6. Create order with quantity 3 of the variant
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: ArrayUtil.repeat(1, () => ({
          ecommerce_platform_product_variant_id: variant.id,
          quantity: 3,
          price: 50,
        })),
      },
    },
  );
  typia.assert(order);
  // 7. Retrieve snapshot for the created order item using orderId, itemId, and snapshotId
  const snapshotId: string = order.items[0].id;
  const snapshot =
    await api.functional.ecommercePlatform.customer.orders.items.snapshots.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: order.items[0].id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot preserves correct transactional state
  TestValidator.equals(
    "entity_type is order_item",
    snapshot.entity_type,
    "order_item",
  );
  TestValidator.equals(
    "snapshot quantity matches ordered quantity",
    snapshot.quantity,
    3,
  );
  TestValidator.equals(
    "snapshot unit_price matches variant price",
    snapshot.unit_price,
    50,
  );
}
