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

export async function test_api_order_item_snapshot_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category for product classification
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller registers, logs in, and creates product with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 3 });
  const basePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        category_id: category.id,
        base_price: basePrice,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const skuCode = RandomGenerator.alphaNumeric(10);
  const optionKey = "color";
  const optionValue = RandomGenerator.name(1);
  const stockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10>
  >();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: skuCode,
          optionValues: [
            {
              key: optionKey,
              value: optionValue,
            },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: stockQuantity,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 3. Customer registers, logs in, creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  const recipientName = RandomGenerator.name(2);
  const phoneNumber = RandomGenerator.mobile();
  const streetAddress = RandomGenerator.paragraph({ sentences: 1 });
  const city = RandomGenerator.name(1);
  const stateProvince = RandomGenerator.name(1);
  const postalCode = RandomGenerator.alphaNumeric(10);
  const country = RandomGenerator.name(1);
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: recipientName,
          phone_number: phoneNumber,
          street_address: streetAddress,
          city: city,
          state_province: stateProvince,
          postal_code: postalCode,
          country: country,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Customer adds product variant to cart
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: quantity,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 5. Customer places order (creates order items with purchase snapshots)
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: recipientName,
        shipping_phone_number: phoneNumber,
        shipping_street_address: streetAddress,
        shipping_city: city,
        shipping_state: stateProvince,
        shipping_postal_code: postalCode,
        shipping_country: country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // 6. Customer retrieves the order item snapshot
  // For purchase snapshots, the snapshot is created during order creation
  // We'll use the order item ID as the snapshot ID (common pattern for purchase snapshots)
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.snapshots.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        snapshotId: orderItem.id,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contains correct data
  TestValidator.equals(
    "snapshot type is purchase",
    snapshot.snapshotType,
    "purchase",
  );
  TestValidator.equals(
    "previous values is null for purchase snapshot",
    snapshot.previousValues,
    null,
  );
  TestValidator.equals(
    "changed by id is null for system-created snapshot",
    snapshot.changedById,
    null,
  );
  // Validate current values contain complete order item state
  TestValidator.equals(
    "product name preserved",
    snapshot.currentValues.productName,
    productName,
  );
  TestValidator.equals(
    "product description preserved",
    snapshot.currentValues.productDescription,
    productDescription,
  );
  TestValidator.equals(
    "variant SKU preserved",
    snapshot.currentValues.variantSku,
    skuCode,
  );
  TestValidator.equals(
    "unit price preserved",
    snapshot.currentValues.unitPrice,
    orderItem.unitPrice,
  );
  TestValidator.equals(
    "quantity preserved",
    snapshot.currentValues.quantity,
    quantity,
  );
  TestValidator.equals("status is paid", snapshot.currentValues.status, "paid");
  // Validate variant options are preserved
  TestValidator.equals(
    "variant options match",
    snapshot.currentValues.variantOptions,
    {
      [optionKey]: optionValue,
    },
  );
  // Validate seller information is preserved
  TestValidator.equals(
    "seller shop name preserved",
    snapshot.currentValues.sellerShopName,
    product.seller.shop_name,
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.currentValues.createdAt,
    ),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      snapshot.currentValues.updatedAt,
    ),
  );
}
