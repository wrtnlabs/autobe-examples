import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test retrieving a variant snapshot with comprehensive option attributes returns complete historical data.
 * Validates snapshots capture multiple variant dimensions (Color, Size, Material, etc.) for complex product configurations.
 */
export async function test_api_customer_order_variant_snapshot_multi_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 1,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create product with multiple images
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 5,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
        }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1000>>(),
        images: [
          { imageUrl: typia.random<string & tags.Format<"uri">>() },
          { imageUrl: typia.random<string & tags.Format<"uri">>() },
        ],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with multiple option values (Color, Size, Material)
  const variantOptions = [
    { optionName: "Color", optionValue: "Red" },
    { optionName: "Size", optionValue: "Large" },
    { optionName: "Material", optionValue: "Cotton" },
  ] satisfies IEcommerceMallProductVariantOption.ICreate[];
  const variantPrice = typia.random<number & tags.Minimum<100>>();
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          options: variantOptions,
          price: variantPrice satisfies number as number,
          stock: 100 satisfies number as number,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 6. Add multi-option variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 7. Checkout to create order and snapshots
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(5),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 8. Validate order structure and retrieve snapshot
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length >= 1,
  );
  TestValidator.equals("order status is paid", order.status, "paid");
  // Cast orderItem to ISummary to access properties
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // Verify the order item has snapshot references
  TestValidator.equals(
    "order item references the purchased variant",
    orderItem.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "order item is linked to the product",
    orderItem.product.id,
    product.id,
  );
  // 9. Retrieve the snapshot using the SDK function
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        snapshotId: orderItem.variant.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot contains all option attributes
  TestValidator.equals(
    "snapshot has correct SKU code",
    snapshot.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "snapshot price matches variant price at checkout",
    snapshot.price,
    orderItem.priceAtPurchase,
  );
  // Verify attributes array contains all option key-value pairs
  TestValidator.predicate(
    "snapshot has attributes array",
    Array.isArray(snapshot.attributes),
  );
  TestValidator.equals(
    "snapshot has correct number of attributes",
    snapshot.attributes.length,
    variantOptions.length,
  );
  // Verify each option is captured in the snapshot
  for (const expectedOption of variantOptions) {
    const foundAttribute = snapshot.attributes.find(
      (attr) =>
        attr.optionKey === expectedOption.optionName &&
        attr.optionValue === expectedOption.optionValue,
    );
    TestValidator.predicate(
      `snapshot contains ${expectedOption.optionName}: ${expectedOption.optionValue}`,
      foundAttribute !== undefined,
    );
  }
  // Verify attribute structure
  for (const attribute of snapshot.attributes) {
    typia.assert<IEcommerceMallOrderItemVariantSnapshotAttribute>(attribute);
    TestValidator.equals(
      "attribute has UUID id",
      typeof attribute.id,
      "string",
    );
    TestValidator.equals(
      "attribute has optionKey",
      typeof attribute.optionKey,
      "string",
    );
    TestValidator.equals(
      "attribute has optionValue",
      typeof attribute.optionValue,
      "string",
    );
    TestValidator.equals(
      "attribute has createdAt",
      typeof attribute.createdAt,
      "string",
    );
  }
  // Verify snapshot timestamp freshness
  TestValidator.predicate(
    "snapshot createdAt is a valid timestamp",
    new Date(snapshot.createdAt).getTime() > 0,
  );
}
