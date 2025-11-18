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
 * Test that an authenticated seller can search SKUs for a specific product
 * using basic pagination and filter options.
 *
 * Business flow
 *
 * 1. Seller joins via /auth/seller/join and becomes authenticated on the
 *    connection.
 * 2. Seller creates a product via /shoppingMall/seller/products.
 * 3. Seller creates multiple SKUs for that product with different status and price
 *    values.
 * 4. Seller calls PATCH /shoppingMall/seller/products/{productId}/skus with status
 *    filter = "active".
 * 5. Verify only active SKUs for that product are returned and pagination metadata
 *    is correct.
 * 6. Repeat search with status = "draft" and verify the result set changes and
 *    remains scoped to the product.
 * 7. Perform a search with a minPrice filter and verify only SKUs above or equal
 *    to that price are returned.
 */
export async function test_api_seller_product_skus_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller creates a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 3. Create multiple SKUs for the product with varied status and price
  const inventoryStateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const skuInputs: IShoppingMallSku.ICreate[] = [
    {
      code: `SKU-A-${RandomGenerator.alphaNumeric(4)}`,
      barcode: RandomGenerator.alphaNumeric(12),
      status: "active",
      price: 100,
      original_price: 120,
      inventory_quantity: 10,
      low_stock_threshold: 2,
      shopping_mall_sku_inventory_state_id: inventoryStateId,
      attribute_value_ids: [],
      external_ids: [
        {
          system_code: "WMS",
          external_id: RandomGenerator.alphaNumeric(10),
        } satisfies IShoppingMallSkuExternalId.ICreate,
      ],
    },
    {
      code: `SKU-B-${RandomGenerator.alphaNumeric(4)}`,
      barcode: RandomGenerator.alphaNumeric(12),
      status: "draft",
      price: 200,
      original_price: 220,
      inventory_quantity: 5,
      low_stock_threshold: 1,
      shopping_mall_sku_inventory_state_id: inventoryStateId,
      attribute_value_ids: [],
      external_ids: [],
    },
    {
      code: `SKU-C-${RandomGenerator.alphaNumeric(4)}`,
      barcode: RandomGenerator.alphaNumeric(12),
      status: "active",
      price: 300,
      original_price: 350,
      inventory_quantity: 20,
      low_stock_threshold: 3,
      shopping_mall_sku_inventory_state_id: inventoryStateId,
      attribute_value_ids: [],
      external_ids: [],
    },
  ];

  const createdSkus: IShoppingMallSku[] = [];
  for (const skuBody of skuInputs) {
    const sku: IShoppingMallSku =
      await api.functional.shoppingMall.seller.products.skus.create(
        connection,
        {
          productId: product.id,
          body: skuBody,
        },
      );
    typia.assert(sku);
    createdSkus.push(sku);
  }

  // Helper to build lookup map by SKU id
  const skuById = new Map<string, IShoppingMallSku>();
  for (const sku of createdSkus) {
    skuById.set(sku.id, sku);
  }

  const pageSize = 10;

  // 4. Search with status = "active"
  const activeRequestBody = {
    page: 1,
    pageSize,
    status: "active",
  } satisfies IShoppingMallSku.IRequest;

  const activePage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: activeRequestBody,
    });
  typia.assert(activePage);

  TestValidator.equals(
    "active search pagination current page should be 1",
    activePage.pagination.current,
    1,
  );
  TestValidator.equals(
    "active search pagination limit should equal requested pageSize",
    activePage.pagination.limit,
    pageSize,
  );

  const activeSkusExpected = createdSkus.filter((s) => s.status === "active");

  TestValidator.predicate(
    "active search should return at least one active SKU",
    activePage.data.length > 0,
  );

  for (const summary of activePage.data) {
    const full = skuById.get(summary.id);
    TestValidator.predicate(
      "active search: summary.id should belong to one of created SKUs",
      full !== undefined,
    );
    if (full !== undefined) {
      TestValidator.equals(
        "active search: full SKU status must be 'active'",
        full.status,
        "active",
      );
    }
  }

  TestValidator.predicate(
    "active search result count should not exceed created active SKUs and must be <= pageSize",
    activePage.data.length <= activeSkusExpected.length &&
      activePage.data.length <= pageSize,
  );

  // 6. Search with status = "draft"
  const draftRequestBody = {
    page: 1,
    pageSize,
    status: "draft",
  } satisfies IShoppingMallSku.IRequest;

  const draftPage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: draftRequestBody,
    });
  typia.assert(draftPage);

  const draftSkusExpected = createdSkus.filter((s) => s.status === "draft");

  TestValidator.predicate(
    "draft search should return at least one draft SKU",
    draftPage.data.length > 0,
  );

  for (const summary of draftPage.data) {
    const full = skuById.get(summary.id);
    TestValidator.predicate(
      "draft search: summary.id should belong to one of created SKUs",
      full !== undefined,
    );
    if (full !== undefined) {
      TestValidator.equals(
        "draft search: full SKU status must be 'draft'",
        full.status,
        "draft",
      );
    }
  }

  if (activePage.data.length > 0 && draftPage.data.length > 0) {
    const activeIds = new Set(activePage.data.map((s) => s.id));
    const draftIds = new Set(draftPage.data.map((s) => s.id));
    const intersection = Array.from(activeIds).filter((id) => draftIds.has(id));
    TestValidator.predicate(
      "active and draft search results should not be identical",
      intersection.length <
        Math.max(activePage.data.length, draftPage.data.length),
    );
  }

  // 7. Search with minPrice filter
  const minPriceValue = createdSkus.reduce(
    (acc, sku) => (sku.price < acc ? sku.price : acc),
    createdSkus[0]?.price ?? 0,
  );

  const minPriceRequestBody = {
    page: 1,
    pageSize,
    minPrice: minPriceValue,
  } satisfies IShoppingMallSku.IRequest;

  const minPricePage: IPageIShoppingMallSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productId: product.id,
      body: minPriceRequestBody,
    });
  typia.assert(minPricePage);

  for (const summary of minPricePage.data) {
    const full = skuById.get(summary.id);
    TestValidator.predicate(
      "minPrice search: summary.id should belong to one of created SKUs",
      full !== undefined,
    );
    if (full !== undefined) {
      TestValidator.predicate(
        "minPrice search: SKU price should be >= minPrice",
        full.price >= minPriceValue,
      );
    }
  }

  TestValidator.predicate(
    "minPrice search result size should be <= total created SKUs and <= pageSize",
    minPricePage.data.length <= createdSkus.length &&
      minPricePage.data.length <= pageSize,
  );
}
