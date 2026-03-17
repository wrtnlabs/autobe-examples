import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";

/**
 * Test customer retrieval of product snapshot from their own order.
 *
 * This test validates that after completing a purchase, the customer can view
 * the preserved product snapshot associated with their order item. The snapshot
 * should contain the exact product state at purchase time including name,
 * description, base price, and category information.
 *
 * Test flow:
 * 1. Admin creates product category
 * 2. Seller creates product with variant
 * 3. Customer adds variant to cart and completes checkout
 * 4. Customer retrieves the specific product snapshot from their order item
 * 5. Verify the response contains IEcommerceMallOrderItemProductSnapshot with all fields
 */
export async function test_api_order_item_product_snapshot_retrieval_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller setup - create product with variant
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
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          options: [
            { optionName: "color", optionValue: "red" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: (typia.random<number & tags.Minimum<1000>>()) satisfies number as number,
          stock: (typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>()) satisfies number as number,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  // 3. Customer setup - join, add to cart, checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: null,
        postalCode: typia.random<string>(),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  // 4. Retrieve product snapshot from order item
  const firstOrderItem = order.orderItems[0] as (IEcommerceMallOrderItem & { id: string; product: { id: string } }) | undefined;
  const orderItemId = firstOrderItem?.id;
  if (orderItemId == null) {
    throw new Error("Order item is required for snapshot retrieval");
  }
  const snapshotId = firstOrderItem?.product.id;
  if (snapshotId == null) {
    throw new Error("Product snapshot ID is required for retrieval");
  }
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.product.snapshots.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItemId,
        snapshotId: snapshotId,
      },
    );
  // 5. Validate snapshot response
  typia.assert(snapshot);
  // Verify snapshot contains preserved product information
  TestValidator.equals(
    "snapshot product name matches original",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches original",
    snapshot.description,
    product.description,
  );
  TestValidator.predicate(
    "snapshot base price is positive",
    snapshot.base_price > 0,
  );
}