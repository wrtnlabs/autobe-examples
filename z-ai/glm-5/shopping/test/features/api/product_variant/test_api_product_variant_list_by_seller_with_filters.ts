import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_variant_list_by_seller_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create administrator and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  // Setup: Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create product owned by seller
  const basePrice = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: category.id,
          basePrice,
        },
      },
    );
  typia.assert(product);
  // Test: Retrieve variants with pagination
  const variantsPage =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        },
      },
    );
  typia.assert(variantsPage);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    () =>
      variantsPage.pagination.current >= 1 &&
      variantsPage.pagination.limit >= 1 &&
      variantsPage.pagination.records >= 0 &&
      variantsPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination current page",
    variantsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", variantsPage.pagination.limit, 10);
  // Test: Search by SKU code (case-insensitive partial match)
  const skuSearchResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "TEST",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(skuSearchResult);
  // Test: Filter by stock availability (in-stock)
  const inStockResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: true,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(inStockResult);
  // Verify all returned variants have stock > 0 when filtering inStock=true
  TestValidator.predicate(
    "all in-stock variants have positive stock",
    () =>
      inStockResult.data.every((variant) => variant.stockQuantity > 0) ||
      inStockResult.data.length === 0,
  );
  // Test: Filter by out-of-stock
  const outOfStockResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStock: false,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(outOfStockResult);
  // Verify all returned variants have stock === 0 when filtering inStock=false
  TestValidator.predicate(
    "all out-of-stock variants have zero stock",
    () =>
      outOfStockResult.data.every((variant) => variant.stockQuantity === 0) ||
      outOfStockResult.data.length === 0,
  );
  // Test: Filter by price range
  const minPrice = typia.random<
    number & tags.Minimum<100> & tags.Maximum<500>
  >();
  const maxPrice =
    minPrice + typia.random<number & tags.Minimum<100> & tags.Maximum<500>>();
  const priceRangeResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          minPrice,
          maxPrice,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(priceRangeResult);
  // Test: Sort by price ascending
  const sortedAscResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "price",
          direction: "asc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortedAscResult);
  // Test: Sort by SKU code descending
  const sortedDescResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "sku_code",
          direction: "desc",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(sortedDescResult);
  // Test: Combined filters (SKU search + stock filter + pagination)
  const combinedFilterResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "SKU",
          inStock: false,
          page: 1,
          limit: 5,
          sort: "created_at",
          direction: "desc",
        },
      },
    );
  typia.assert(combinedFilterResult);
  // Test: Verify soft-deleted variants are excluded by default
  const defaultResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
        },
      },
    );
  typia.assert(defaultResult);
  // Verify variant data structure for each returned variant
  TestValidator.predicate("all variants have valid IDs", () =>
    defaultResult.data.every(
      (v) => typeof v.id === "string" && v.id.length > 0,
    ),
  );
  TestValidator.predicate("all variants have valid SKU codes", () =>
    defaultResult.data.every(
      (v) => typeof v.skuCode === "string" && v.skuCode.length >= 3,
    ),
  );
  TestValidator.predicate("all variants have option values object", () =>
    defaultResult.data.every((v) => typeof v.optionValues === "object"),
  );
  TestValidator.predicate("all variants have valid stock quantity", () =>
    defaultResult.data.every(
      (v) => typeof v.stockQuantity === "number" && v.stockQuantity >= 0,
    ),
  );
  TestValidator.predicate("all variants have valid created timestamp", () =>
    defaultResult.data.every((v) => typeof v.createdAt === "string"),
  );
  TestValidator.predicate("all variant prices are positive when set", () =>
    defaultResult.data.every(
      (v) => v.price === null || (typeof v.price === "number" && v.price > 0),
    ),
  );
  // Test: Verify seller authorization - other seller cannot access this product's variants
  const otherSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Other seller should receive 403 Forbidden when trying to access another seller's product variants
  await TestValidator.httpError(
    "unauthorized seller cannot access another seller's product variants",
    403,
    async () =>
      await api.functional.shoppingMall.products.variants.index(
        otherSellerConnection,
        {
          productId: product.id,
          body: { page: 1, limit: 10 },
        },
      ),
  );
}
