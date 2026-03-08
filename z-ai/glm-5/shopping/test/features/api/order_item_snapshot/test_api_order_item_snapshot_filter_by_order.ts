import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_snapshot_filter_by_order(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a customer can filter their order item snapshots by order ID
   * to view all snapshots from a specific order.
   */
  // 1. Set up administrator and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Set up seller and create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product1);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product2);
  // 3. Create variants for products
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: { color: "Red", size: "Large" },
          price: product1.base_price,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: { color: "Blue", size: "Medium" },
          price: product2.base_price + 500,
        },
      },
    );
  typia.assert(variant2);
  // 4. Add inventory to variants
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant1.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for testing",
      },
    },
  );
  await generate_random_shopping_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for testing",
      },
    },
  );
  // 5. Set up customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Add items to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant1.id,
        quantity: 2,
      },
    },
  );
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant2.id,
        quantity: 3,
      },
    },
  );
  // 7. Create order via checkout
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 8. Test filtering by orderId
  const snapshotsByOrder =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByOrder);
  // Verify all snapshots belong to the order
  TestValidator.predicate(
    "all snapshots from order",
    snapshotsByOrder.data.length === 2,
  );
  // Verify snapshots share similar creation timestamp (within transaction)
  const timestamps = snapshotsByOrder.data.map((s) => s.created_at);
  const timeDiff = Math.abs(
    new Date(timestamps[0]).getTime() - new Date(timestamps[1]).getTime(),
  );
  TestValidator.predicate(
    "snapshots created within same transaction",
    timeDiff < 5000,
  );
  // Verify each snapshot has different variant_options
  const variantOptions = snapshotsByOrder.data.map((s) =>
    JSON.stringify(s.variant_options.map((v) => v.option_value).sort()),
  );
  TestValidator.notEquals(
    "variant options differ between snapshots",
    variantOptions[0],
    variantOptions[1],
  );
  // 9. Test filtering by product name combined with orderId
  const snapshotsByProduct =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          productName: product1.name,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByProduct);
  TestValidator.predicate(
    "filter by product name returns correct snapshot",
    snapshotsByProduct.data.length === 1 &&
      snapshotsByProduct.data[0].product_name === product1.name,
  );
  // 10. Test combining filters with price range
  const priceMin = Math.min(product1.base_price, product2.base_price);
  const priceMax = Math.max(product1.base_price, product2.base_price) + 1000;
  const snapshotsByPriceRange =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          priceMin,
          priceMax,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsByPriceRange);
  TestValidator.predicate(
    "price range filter returns all snapshots",
    snapshotsByPriceRange.data.length === 2,
  );
  // 11. Test pagination with filters
  const paginatedResult =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          limit: 1,
          page: 1,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination total records correct",
    paginatedResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination total pages correct",
    paginatedResult.pagination.pages,
    2,
  );
  // Test second page
  const secondPage =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          limit: 1,
          page: 2,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("second page has one item", secondPage.data.length, 1);
  // Verify different items on different pages
  TestValidator.notEquals(
    "different items on different pages",
    paginatedResult.data[0].id,
    secondPage.data[0].id,
  );
  // 12. Test seller shop name filter
  const snapshotsBySeller =
    await api.functional.shoppingMall.customer.orderItemSnapshots.index(
      customerConnection,
      {
        body: {
          orderId: order.id,
          sellerShopName: seller.shopName,
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsBySeller);
  TestValidator.predicate(
    "all snapshots from same seller",
    snapshotsBySeller.data.every((s) => s.seller_shop_name === seller.shopName),
  );
}
