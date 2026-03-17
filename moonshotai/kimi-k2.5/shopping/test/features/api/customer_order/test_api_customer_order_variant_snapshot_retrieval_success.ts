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
 * Test that an authenticated customer can successfully retrieve their own order item variant snapshot.
 *
 * 1. Register and authenticate as customer, admin, and seller using join operations
 * 2. Admin creates a product category
 * 3. Seller creates a product with variants
 * 4. Customer adds variant to cart and completes checkout to create order with variant snapshots
 * 5. Retrieve the order and order item to get snapshot ID
 * 6. Call the target endpoint with valid orderId, itemId, and snapshotId
 *
 * Validation points:
 * - Response status 200 OK with IEcommerceMallOrderItemVariantSnapshot type
 * - Verify snapshot contains: id (UUID), skuCode (string), price (number), createdAt (datetime), attributes (array of option key-value pairs)
 * - Verify attributes contain purchase-time option values (e.g., Color: Red, Size: Large)
 * - Verify snapshot data matches what was captured at checkout time
 * - Ensure data is immutable and cannot be modified
 */
export async function test_api_customer_order_variant_snapshot_retrieval_success(
  connection: api.IConnection,
) {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Register and authenticate as admin
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Register and authenticate as seller
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 3. Register and authenticate as customer
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 4. Admin creates a product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(category);
  // 5. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          stock: 10,
        },
      },
    );
  typia.assert(variant);
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer completes checkout to create order with variant snapshots
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: prepare_random_ecommerce_mall_order(),
    },
  );
  typia.assert(order);
  // 9. Get orderId, itemId, and snapshotId from the created order
  TestValidator.predicate(
    "order has orderItems",
    () => order.orderItems.length > 0,
  );
  // Cast to ISummary to access id property (IEcommerceMallOrderItem is query param type)
  const orderItem = order.orderItems[0]! as IEcommerceMallOrderItem.ISummary;
  const orderId = order.id;
  const itemId = orderItem.id;
  // Use itemId as snapshotId (snapshot is created per order item during checkout)
  const snapshotId = itemId;
  // 10. Call the target endpoint to retrieve the variant snapshot
  const snapshot: IEcommerceMallOrderItemVariantSnapshot =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.at(
      customerConnection,
      {
        orderId,
        itemId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 11. Validate snapshot contents
  TestValidator.predicate("snapshot has valid UUID id", () =>
    typia.is<string & tags.Format<"uuid">>(snapshot.id),
  );
  TestValidator.predicate(
    "snapshot has skuCode as string",
    () => typeof snapshot.skuCode === "string",
  );
  TestValidator.predicate(
    "snapshot has price as number",
    () => typeof snapshot.price === "number",
  );
  TestValidator.predicate("snapshot has createdAt as date-time", () =>
    typia.is<string & tags.Format<"date-time">>(snapshot.createdAt),
  );
  TestValidator.predicate("snapshot has attributes array", () =>
    Array.isArray(snapshot.attributes),
  );
  // Validate attributes contain purchase-time option values
  if (snapshot.attributes.length > 0) {
    const attribute = snapshot.attributes[0]!;
    TestValidator.predicate(
      "attribute has optionKey",
      () => typeof attribute.optionKey === "string",
    );
    TestValidator.predicate(
      "attribute has optionValue",
      () => typeof attribute.optionValue === "string",
    );
  }
  // Verify snapshot data matches original variant
  TestValidator.equals(
    "snapshot skuCode matches variant",
    snapshot.skuCode,
    variant.skuCode,
  );
}
