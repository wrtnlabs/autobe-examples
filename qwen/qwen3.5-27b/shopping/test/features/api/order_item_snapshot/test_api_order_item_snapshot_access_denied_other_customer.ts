import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a customer cannot access order item snapshots from orders placed by other customers.
 *
 * Validates the authorization boundary for order item snapshot access. Customers should only be able to view snapshots of items in their own orders, ensuring data privacy and isolation between different customer accounts.
 *
 * The test creates two separate customer accounts and verifies that when the first customer attempts to retrieve a snapshot from the second customer's order, the system returns an authorization error.
 *
 * 1. First customer (customer A) registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Seller creates a product with variants.
 * 4. Second customer (customer B) registers and authenticates.
 * 5. Customer B adds a product variant to cart and completes checkout, creating an order with snapshots.
 * 6. Customer A attempts to access an order item snapshot from customer B's order.
 * 7. Verify that the access is denied with a 403 Forbidden error.
 */
export async function test_api_order_item_snapshot_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. First customer (customer A) joins and authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Seller creates a product
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(product);
  // Ensure product has at least one variant
  if (product.variants.length === 0) {
    throw new Error(
      "Product must have at least one variant for testing. This test requires a product with variants.",
    );
  }
  const variant = product.variants[0];
  // 4. Second customer (customer B) joins and authenticates
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Customer B adds product variant to cart
  const cartItem: IShoppingMallCustomerCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer B completes checkout to create order with snapshots
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_checkout(customerBConnection, {
      body: {},
    });
  typia.assert(order);
  // Verify order has items
  if (order.items.length === 0) {
    throw new Error(
      "Order must have at least one item for testing. Checkout should create order items.",
    );
  }
  // The order item contains snapshot data embedded (product_name, variant_sku_code, etc.)
  // However, the snapshot ID itself is not directly exposed in the response.
  // For this test, we'll use the order item's ID as a proxy for the snapshot ID,
  // as the snapshot is created for each order item.
  const orderItem = order.items[0];
  const snapshotId: string & tags.Format<"uuid"> = orderItem.id;
  // 7. Customer A attempts to access the snapshot from customer B's order
  // This should fail with 403 Forbidden because customer A doesn't own this order
  await TestValidator.httpError(
    "customer A cannot access customer B's order item snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.customer.order_item_snapshots.at(
        customerAConnection,
        {
          snapshotId: snapshotId,
        },
      );
    },
  );
  // Additional validation: Verify that customer B CAN access their own snapshot
  // This confirms the snapshot exists and is accessible to the rightful owner
  const snapshot: IShoppingMallOrderItemSnapshot =
    await api.functional.shoppingMall.customer.order_item_snapshots.at(
      customerBConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate that the snapshot data matches the order item
  TestValidator.equals(
    "snapshot product name matches order item",
    snapshot.product_name,
    orderItem.product_name,
  );
  TestValidator.equals(
    "snapshot variant SKU matches order item",
    snapshot.variant_sku_code,
    orderItem.variant_sku_code,
  );
}
