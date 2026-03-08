import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IJsonObject } from "@ORGANIZATION/PROJECT-api/lib/structures/IJsonObject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test customer cannot access order item snapshots they do not own.
 *
 * This test validates data isolation by ensuring customers can only view
 * snapshots for order items belonging to their own orders. After two customers
 * (A and B) complete separate orders, customer A attempts to query snapshots
 * for customer B's order item. The system must reject this unauthorized access
 * attempt with an appropriate error.
 *
 * Setup flow:
 * 1. Admin and seller authentication
 * 2. Category and product creation
 * 3. Two customers register and create shipping addresses
 * 4. Both customers add products to cart and place orders
 * 5. Customer A attempts to access Customer B's order item snapshots
 * 6. Validate authorization error is returned
 */
export async function test_api_order_item_snapshots_data_isolation_customer(
  connection: api.IConnection,
): Promise<void> {
  // ==================== SETUP: Admin and Seller ====================
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Admin approves seller
  await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.seller.id,
  });
  // Admin creates category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Seller creates product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller creates product variant
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ==================== SETUP: Customer A ====================
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // Customer A creates shipping address
  const addressA = await api.functional.ecommerceMall.customer.addresses.create(
    customerAConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(10),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(addressA);
  // Customer A adds variant to cart
  await api.functional.ecommerceMall.customer.cart_items.create(
    customerAConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Customer A places order
  const orderA = await api.functional.ecommerceMall.customer.orders.create(
    customerAConnection,
    {
      body: {
        shipping_recipient_name: addressA.recipientName,
        shipping_phone_number: addressA.phoneNumber,
        shipping_street_address: addressA.streetAddress,
        shipping_city: addressA.city,
        shipping_state: addressA.stateProvince,
        shipping_postal_code: addressA.postalCode,
        shipping_country: addressA.country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderA);
  // Extract Customer A's order item ID
  const orderItemAId = orderA.order_items[0].id;
  // ==================== SETUP: Customer B ====================
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // Customer B creates shipping address
  const addressB = await api.functional.ecommerceMall.customer.addresses.create(
    customerBConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(10),
        country: "South Korea",
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(addressB);
  // Customer B adds variant to cart
  await api.functional.ecommerceMall.customer.cart_items.create(
    customerBConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Customer B places order
  const orderB = await api.functional.ecommerceMall.customer.orders.create(
    customerBConnection,
    {
      body: {
        shipping_recipient_name: addressB.recipientName,
        shipping_phone_number: addressB.phoneNumber,
        shipping_street_address: addressB.streetAddress,
        shipping_city: addressB.city,
        shipping_state: addressB.stateProvince,
        shipping_postal_code: addressB.postalCode,
        shipping_country: addressB.country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(orderB);
  // Extract Customer B's order item ID
  const orderItemBId = orderB.order_items[0].id;
  // ==================== TEST: Customer A tries to access Customer B's snapshots ====================
  // Customer A attempts to query snapshots for Customer B's order item
  // This should fail with authorization error
  await TestValidator.httpError(
    "customer A cannot access customer B's order item snapshots",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.orders.items.snapshots.index(
        customerAConnection,
        {
          orderId: orderB.id,
          itemId: orderItemBId,
          body: {
            page: 1,
            limit: 20,
          } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
        },
      );
    },
  );
  // Verify Customer A CAN access their own order item snapshots (positive test)
  const snapshotsA =
    await api.functional.ecommerceMall.customer.orders.items.snapshots.index(
      customerAConnection,
      {
        orderId: orderA.id,
        itemId: orderItemAId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsA);
  TestValidator.predicate(
    "customer A can access their own snapshots",
    snapshotsA.pagination.records >= 1,
  );
}