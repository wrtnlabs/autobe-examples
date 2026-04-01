import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can successfully retrieve the snapshot of an order item for their own product.
 *
 * Workflow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product with variants
 * 3. Customer registers and places an order containing that product variant
 * 4. Seller lists their order items to get the order item ID
 * 5. Seller retrieves snapshots for the order item to get snapshot ID
 * 6. Seller retrieves the specific snapshot and validates all fields
 */
export async function test_api_order_item_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  // 1. Seller setup - register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Customer places order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Find the order item for our product variant
  const orderItem = order.orderItems.find(
    (item) => item.productVariant.id === variant.id,
  );
  TestValidator.predicate(
    "order contains our variant",
    orderItem !== undefined,
  );
  const orderItemId = orderItem!.id;
  // 6. Seller lists order items to verify they can see the order
  const sellerOrderItems =
    await api.functional.shoppingMall.seller.order_items.index(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_order_id: order.id,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sellerOrderItems);
  // Verify the order item is in the seller's list
  const sellerOrderItem = sellerOrderItems.data.find(
    (item) => item.id === orderItemId,
  );
  TestValidator.predicate(
    "seller can see order item",
    sellerOrderItem !== undefined,
  );
  // 7. Seller retrieves snapshots for the order item
  const snapshot =
    await api.functional.shoppingMall.seller.orders.items.snapshots.patchByItemid(
      sellerLoginConnection,
      {
        itemId: orderItemId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot contains correct data (business logic validation)
  TestValidator.equals(
    "product name matches",
    snapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    snapshot.productDescription,
    product.description,
  );
  TestValidator.equals(
    "variant SKU matches",
    snapshot.variantSkuCode,
    variant.skuCode,
  );
  // Validate variant price (use price_override if set, otherwise base_price)
  const expectedVariantPrice = variant.priceOverride ?? product.base_price;
  TestValidator.equals(
    "variant price matches",
    snapshot.variantPrice,
    expectedVariantPrice,
  );
  // Validate variant options exist and have required fields
  TestValidator.predicate(
    "variant options exist",
    snapshot.variantOptions.length > 0,
  );
  // Validate seller shop name exists (seller shop logo may be null)
  TestValidator.predicate(
    "seller shop name exists",
    snapshot.sellerShopName.length > 0,
  );
  // Validate snapshot metadata
  TestValidator.predicate("snapshot has ID", snapshot.id.length > 0);
  TestValidator.equals(
    "snapshot order item ID matches",
    snapshot.orderItemId,
    orderItemId,
  );
  TestValidator.predicate(
    "snapshot has createdAt",
    snapshot.createdAt.length > 0,
  );
}