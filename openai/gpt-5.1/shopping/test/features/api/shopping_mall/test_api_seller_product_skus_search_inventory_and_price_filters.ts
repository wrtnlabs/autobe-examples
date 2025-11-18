import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSku";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate seller product SKU search by price band and inventory filters.
 *
 * Business flow:
 *
 * 1. Seller joins (auth.seller.join) to obtain an authenticated seller context.
 * 2. Seller creates a single product via POST /shoppingMall/seller/products.
 * 3. Seller creates multiple SKUs under that product with deliberately diverse
 *    combinations of:
 *
 *    - Price
 *    - Inventory_quantity
 *    - Low_stock_threshold
 * 4. Seller calls PATCH /shoppingMall/seller/products/{productId}/skus with
 *    IShoppingMallSku.IRequest specifying:
 *
 *    - Page/pageSize
 *    - MinPrice/maxPrice
 *    - MinInventoryQuantity/maxInventoryQuantity to define a price and inventory
 *         band.
 * 5. The test asserts that:
 *
 *    - All returned SKUs belong to the created product
 *    - Every SKU’s price and inventory_quantity fall within the requested bands
 *    - No seeded SKU that matches the product but lies outside the requested band
 *         appears in the result.
 * 6. Seller calls the same endpoint again with lowStockOnly=true (and
 *    page/pageSize) to retrieve only SKUs whose inventory_quantity <=
 *    low_stock_threshold.
 * 7. The test asserts that:
 *
 *    - All returned SKUs satisfy inventory_quantity <= low_stock_threshold (non-null
 *         threshold)
 *    - SKUs whose inventory_quantity is above their threshold are not present in the
 *         low-stock result set.
 */
export async function test_api_seller_product_skus_search_inventory_and_price_filters(
  connection: api.IConnection,
) {
  // 1. Seller join to obtain authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinBody });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create a product owned by this seller
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 16,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: null,
    model_name: null,
    status: "active",
    primary_image_uri: null,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Seed SKUs with diverse price and inventory characteristics
  const inventoryStateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  type SeedSkuSpec = {
    label: string;
    price: number;
    originalPrice: number | null;
    inventoryQuantity: number;
    lowStockThreshold: number | null;
  };

  const seedSpecs: SeedSkuSpec[] = [
    {
      label: "cheap_low_stock",
      price: 50,
      originalPrice: 80,
      inventoryQuantity: 3,
      lowStockThreshold: 5,
    },
    {
      label: "cheap_high_stock",
      price: 60,
      originalPrice: 90,
      inventoryQuantity: 20,
      lowStockThreshold: 5,
    },
    {
      label: "mid_low_stock",
      price: 150,
      originalPrice: 200,
      inventoryQuantity: 4,
      lowStockThreshold: 5,
    },
    {
      label: "expensive_high_stock",
      price: 300,
      originalPrice: 350,
      inventoryQuantity: 50,
      lowStockThreshold: 10,
    },
  ];

  const createdSkus: IShoppingMallSku[] = [];

  for (const spec of seedSpecs) {
    const createBody = {
      code: `${spec.label}_${RandomGenerator.alphaNumeric(6)}`,
      barcode: null,
      status: "active",
      price: spec.price,
      original_price: spec.originalPrice,
      inventory_quantity: spec.inventoryQuantity,
      low_stock_threshold: spec.lowStockThreshold,
      shopping_mall_sku_inventory_state_id: inventoryStateId,
      attribute_value_ids: [],
      external_ids: [],
    } satisfies IShoppingMallSku.ICreate;

    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: createBody,
        },
      );
    typia.assert<IShoppingMallSku>(sku);
    createdSkus.push(sku);
  }

  // Helper to build a map from SKU id to seed metadata for assertions
  const skuById: Map<string, SeedSkuSpec> = new Map(
    createdSkus.map((sku, index) => [sku.id, seedSpecs[index]] as const),
  );

  // 4. Search with price and inventory band filters
  const priceBandMin = 50;
  const priceBandMax = 200;
  const inventoryMin = 0;
  const inventoryMax = 10;

  const bandRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: undefined,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: priceBandMin,
    maxPrice: priceBandMax,
    minInventoryQuantity: inventoryMin,
    maxInventoryQuantity: inventoryMax,
    lowStockOnly: undefined,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: "price",
    sortDirection: "asc",
  } satisfies IShoppingMallSku.IRequest;

  const bandPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: bandRequestBody,
    });
  typia.assert<IPageIShoppingMallSku.ISummary>(bandPage);

  // 5. Assert all returned SKUs satisfy band constraints and belong to our product
  const bandSkuIds = bandPage.data.map((s) => s.id);

  for (const summary of bandPage.data) {
    const seed = skuById.get(summary.id);
    TestValidator.predicate(
      "band search result SKU must be one of seeded SKUs",
      seed !== undefined,
    );
    if (seed !== undefined) {
      TestValidator.predicate(
        "SKU price within band",
        seed.price >= priceBandMin && seed.price <= priceBandMax,
      );
      TestValidator.predicate(
        "SKU inventory within band",
        seed.inventoryQuantity >= inventoryMin &&
          seed.inventoryQuantity <= inventoryMax,
      );
    }
  }

  // Also confirm that any seeded SKU that does NOT match the bands is excluded
  for (const [id, seed] of skuById.entries()) {
    const inBand =
      seed.price >= priceBandMin &&
      seed.price <= priceBandMax &&
      seed.inventoryQuantity >= inventoryMin &&
      seed.inventoryQuantity <= inventoryMax;
    if (!inBand) {
      TestValidator.predicate(
        "out-of-band SKU must not appear in band result",
        bandSkuIds.includes(id) === false,
      );
    }
  }

  // 6. Search for low-stock SKUs using lowStockOnly=true
  const lowStockRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    productId: undefined,
    status: undefined,
    statusList: undefined,
    inventoryStateCode: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    minInventoryQuantity: undefined,
    maxInventoryQuantity: undefined,
    lowStockOnly: true,
    includeDeleted: false,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    sortField: "inventory_quantity",
    sortDirection: "asc",
  } satisfies IShoppingMallSku.IRequest;

  const lowStockPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: lowStockRequestBody,
    });
  typia.assert<IPageIShoppingMallSku.ISummary>(lowStockPage);

  const lowStockIds = lowStockPage.data.map((s) => s.id);

  // Determine which seeded SKUs should qualify as low stock
  const expectedLowStockIds: string[] = [];
  for (const sku of createdSkus) {
    const seed = skuById.get(sku.id);
    if (seed === undefined) continue;
    if (seed.lowStockThreshold !== null) {
      if (seed.inventoryQuantity <= seed.lowStockThreshold) {
        expectedLowStockIds.push(sku.id);
      }
    }
  }

  // Assert every returned SKU is low stock and no non-low-stock SKU is present
  for (const summary of lowStockPage.data) {
    const seed = skuById.get(summary.id);
    TestValidator.predicate(
      "low-stock search result SKU must be one of seeded SKUs",
      seed !== undefined,
    );
    if (seed !== undefined) {
      TestValidator.predicate(
        "low-stock result must have non-null threshold",
        seed.lowStockThreshold !== null,
      );
      if (seed.lowStockThreshold !== null) {
        TestValidator.predicate(
          "inventory_quantity <= low_stock_threshold",
          seed.inventoryQuantity <= seed.lowStockThreshold,
        );
      }
    }
  }

  for (const [id, seed] of skuById.entries()) {
    if (seed.lowStockThreshold === null) {
      TestValidator.predicate(
        "SKU without low_stock_threshold should not be in low-stock results",
        lowStockIds.includes(id) === false,
      );
      continue;
    }
    const isLowStock = seed.inventoryQuantity <= seed.lowStockThreshold;
    if (!isLowStock) {
      TestValidator.predicate(
        "non-low-stock SKU should not appear in low-stock results",
        lowStockIds.includes(id) === false,
      );
    } else {
      TestValidator.predicate(
        "expected low-stock SKU should appear in results",
        lowStockIds.includes(id) === true,
      );
    }
  }
}
