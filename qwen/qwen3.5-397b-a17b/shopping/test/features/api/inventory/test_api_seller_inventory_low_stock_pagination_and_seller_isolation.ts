import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test pagination and seller isolation for the low-stock endpoint.
 *
 * This test verifies:
 * 1. Seller isolation - each seller only sees their own low-stock products
 * 2. Pagination functionality with proper metadata (current, limit, records, pages)
 * 3. Correct distribution of products across pages
 * 4. Consistent results when navigating between pages
 *
 * Test flow:
 * 1. Register and authenticate as seller A
 * 2. Create 8 products for seller A with low stock (threshold < 10)
 * 3. Register and authenticate as seller B
 * 4. Create 5 products for seller B with low stock
 * 5. Query low-stock products for seller A with limit=5
 * 6. Verify seller A only sees their 8 products (not seller B's)
 * 7. Verify pagination metadata and page navigation
 * 8. Query low-stock products for seller B
 * 9. Verify seller B only sees their 5 products (not seller A's)
 */
export async function test_api_seller_inventory_low_stock_pagination_and_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  // 2. Create 8 products for seller A with variants and low inventory
  const sellerAProducts: IShoppingMallProduct[] = [];
  for (let i = 0; i < 8; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      {
        body: {
          name: `Seller A Product ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
    typia.assert(product);
    sellerAProducts.push(product);
    // Create a variant for each product
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerAConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SELLER-A-SKU-${i + 1}-${RandomGenerator.alphaNumeric(4)}`,
            price_override: null,
            option_value_ids: [],
          },
        },
      );
    typia.assert(variant);
    // Add low inventory record (stock < 10 to trigger low-stock)
    const inventoryRecord =
      await generate_random_shopping_mall_seller_inventory_records_create(
        sellerAConnection,
        {
          body: {
            product_variant_id: variant.id,
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            reason: "restock",
          },
        },
      );
    typia.assert(inventoryRecord);
  }
  // 3. Register and authenticate as seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  // 4. Create 5 products for seller B with variants and low inventory
  const sellerBProducts: IShoppingMallProduct[] = [];
  for (let i = 0; i < 5; i++) {
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      {
        body: {
          name: `Seller B Product ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
    typia.assert(product);
    sellerBProducts.push(product);
    // Create a variant for each product
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create(
        sellerBConnection,
        {
          params: { productId: product.id },
          body: {
            sku_code: `SELLER-B-SKU-${i + 1}-${RandomGenerator.alphaNumeric(4)}`,
            price_override: null,
            option_value_ids: [],
          },
        },
      );
    typia.assert(variant);
    // Add low inventory record (stock < 10 to trigger low-stock)
    const inventoryRecord =
      await generate_random_shopping_mall_seller_inventory_records_create(
        sellerBConnection,
        {
          body: {
            product_variant_id: variant.id,
            quantity_change: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            reason: "restock",
          },
        },
      );
    typia.assert(inventoryRecord);
  }
  // 5. Query low-stock products for seller A with threshold=10 and limit=5
  const threshold = 10;
  const limit = 5;
  // Get page 1 for seller A
  const sellerALowStockPage1 =
    await api.functional.shoppingMall.seller.products.inventory.low_stock.index(
      sellerAConnection,
      {
        body: {
          threshold: threshold,
          page: 1,
          limit: limit,
        } satisfies IShoppingMallProduct.ILowStockRequest,
      },
    );
  typia.assert(sellerALowStockPage1);
  // 6. Verify seller A only sees their own products (seller isolation)
  TestValidator.equals(
    "seller A page 1 - current page",
    sellerALowStockPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller A page 1 - limit",
    sellerALowStockPage1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "seller A page 1 - total records",
    sellerALowStockPage1.pagination.records,
    8,
  );
  TestValidator.equals(
    "seller A page 1 - total pages",
    sellerALowStockPage1.pagination.pages,
    2,
  );
  TestValidator.equals(
    "seller A page 1 - data length",
    sellerALowStockPage1.data.length,
    5,
  );
  // Verify all products on page 1 belong to seller A
  for (const item of sellerALowStockPage1.data) {
    const isSellerAProduct = sellerAProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller isolation - product ${item.id} belongs to seller A`,
      isSellerAProduct,
    );
    // Verify product does NOT belong to seller B
    const isSellerBProduct = sellerBProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller isolation - product ${item.id} does NOT belong to seller B`,
      !isSellerBProduct,
    );
    // Verify stock is below threshold
    TestValidator.predicate(
      `product ${item.name} has low stock`,
      item.current_stock < threshold,
    );
    TestValidator.equals(
      `product ${item.name} threshold matches`,
      item.threshold,
      threshold,
    );
  }
  // Get page 2 for seller A
  const sellerALowStockPage2 =
    await api.functional.shoppingMall.seller.products.inventory.low_stock.index(
      sellerAConnection,
      {
        body: {
          threshold: threshold,
          page: 2,
          limit: limit,
        } satisfies IShoppingMallProduct.ILowStockRequest,
      },
    );
  typia.assert(sellerALowStockPage2);
  // Verify page 2 metadata and data
  TestValidator.equals(
    "seller A page 2 - current page",
    sellerALowStockPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "seller A page 2 - limit",
    sellerALowStockPage2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "seller A page 2 - total records",
    sellerALowStockPage2.pagination.records,
    8,
  );
  TestValidator.equals(
    "seller A page 2 - total pages",
    sellerALowStockPage2.pagination.pages,
    2,
  );
  TestValidator.equals(
    "seller A page 2 - data length",
    sellerALowStockPage2.data.length,
    3,
  );
  // Verify all products on page 2 belong to seller A
  for (const item of sellerALowStockPage2.data) {
    const isSellerAProduct = sellerAProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller isolation page 2 - product ${item.id} belongs to seller A`,
      isSellerAProduct,
    );
    const isSellerBProduct = sellerBProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller isolation page 2 - product ${item.id} does NOT belong to seller B`,
      !isSellerBProduct,
    );
  }
  // Verify no duplicate products across pages
  const page1Ids = sellerALowStockPage1.data.map((item) => item.id);
  const page2Ids = sellerALowStockPage2.data.map((item) => item.id);
  const hasDuplicates = page1Ids.some((id) => page2Ids.includes(id));
  TestValidator.predicate("no duplicate products across pages", !hasDuplicates);
  // 8. Query low-stock products for seller B
  const sellerBLowStock =
    await api.functional.shoppingMall.seller.products.inventory.low_stock.index(
      sellerBConnection,
      {
        body: {
          threshold: threshold,
          page: 1,
          limit: limit,
        } satisfies IShoppingMallProduct.ILowStockRequest,
      },
    );
  typia.assert(sellerBLowStock);
  // 9. Verify seller B only sees their own products (seller isolation)
  TestValidator.equals(
    "seller B - current page",
    sellerBLowStock.pagination.current,
    1,
  );
  TestValidator.equals(
    "seller B - limit",
    sellerBLowStock.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "seller B - total records",
    sellerBLowStock.pagination.records,
    5,
  );
  TestValidator.equals(
    "seller B - total pages",
    sellerBLowStock.pagination.pages,
    1,
  );
  TestValidator.equals(
    "seller B - data length",
    sellerBLowStock.data.length,
    5,
  );
  // Verify all products belong to seller B
  for (const item of sellerBLowStock.data) {
    const isSellerBProduct = sellerBProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller B isolation - product ${item.id} belongs to seller B`,
      isSellerBProduct,
    );
    // Verify product does NOT belong to seller A
    const isSellerAProduct = sellerAProducts.some((p) => p.id === item.id);
    TestValidator.predicate(
      `seller B isolation - product ${item.id} does NOT belong to seller A`,
      !isSellerAProduct,
    );
    // Verify stock is below threshold
    TestValidator.predicate(
      `seller B product ${item.name} has low stock`,
      item.current_stock < threshold,
    );
  }
}
