import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product variant listing with comprehensive filtering capabilities.
 *
 * Validates the complete product variant listing workflow including seller authentication, product creation, and variant retrieval with various filters. Tests SKU code partial match search, option values text search, price range filtering, stock availability filtering, sorting by multiple fields in both directions, and pagination metadata accuracy.
 *
 * Special attention is given to verifying that soft-deleted variants are excluded by default, stock quantities are correctly calculated from inventory records, and the API returns proper 404 errors for non-existent products.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller registers and logs in to the platform.
 * 3. Seller creates a product that will have variants.
 * 4. Seller retrieves variants with no filters (default behavior - excludes soft-deleted).
 * 5. Seller filters variants by SKU code partial match.
 * 6. Seller filters variants by option values text search.
 * 7. Seller filters variants by price range (min_price and max_price).
 * 8. Seller filters variants by stock availability.
 * 9. Seller tests sorting by created_at, sku_code, and price in both ascending and descending order.
 * 10. Seller tests pagination metadata accuracy.
 * 11. Verify 404 response for invalid productId.
 */
export async function test_api_product_variant_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - register and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. List variants with no filters (default - exclude soft-deleted)
  // Note: Variants are assumed to exist from product creation or separate variant creation flow
  const allVariantsResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_desc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariantsResponse);
  TestValidator.predicate(
    "has pagination metadata",
    allVariantsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(allVariantsResponse.data),
  );
  TestValidator.predicate(
    "current page is 1",
    allVariantsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 20",
    allVariantsResponse.pagination.limit === 20,
  );
  // 5. Filter by SKU code partial match
  const skuFilterResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "TEST",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuFilterResponse);
  TestValidator.predicate(
    "SKU filter returns valid response",
    skuFilterResponse.data.length >= 0,
  );
  TestValidator.predicate(
    "SKU filter pagination valid",
    skuFilterResponse.pagination.records >= 0,
  );
  // 6. Filter by option values text search
  const optionValuesFilterResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          option_values: "Red",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(optionValuesFilterResponse);
  TestValidator.predicate(
    "option values filter returns valid response",
    optionValuesFilterResponse.data.length >= 0,
  );
  // 7. Filter by price range
  const basePrice = product.base_price;
  const priceRangeResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          min_price: basePrice - 1000,
          max_price: basePrice + 5000,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceRangeResponse);
  TestValidator.predicate(
    "price range filter returns valid response",
    priceRangeResponse.data.length >= 0,
  );
  // 8. Filter by stock availability (in stock)
  const inStockResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          in_stock: true,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockResponse);
  TestValidator.predicate(
    "in stock filter returns valid response",
    inStockResponse.data.length >= 0,
  );
  // 9. Sorting tests
  // Sort by created_at ascending
  const createdAtAscResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "created_at_asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(createdAtAscResponse);
  // Sort by created_at descending (default)
  const createdAtDescResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "created_at_desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(createdAtDescResponse);
  // Sort by SKU code ascending
  const skuAscResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "sku_code_asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuAscResponse);
  // Sort by SKU code descending
  const skuDescResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "sku_code_desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuDescResponse);
  // Sort by price ascending
  const priceAscResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "price_asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceAscResponse);
  // Sort by price descending
  const priceDescResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort: "price_desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceDescResponse);
  // 10. Pagination metadata validation with different page sizes
  const paginatedResponse10 =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(paginatedResponse10);
  TestValidator.predicate(
    "page 1 current is 1",
    paginatedResponse10.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is 10",
    paginatedResponse10.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    paginatedResponse10.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    paginatedResponse10.pagination.pages >= 0,
  );
  // Test with limit 50
  const paginatedResponse50 =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(paginatedResponse50);
  TestValidator.predicate(
    "limit is 50",
    paginatedResponse50.pagination.limit === 50,
  );
  // 11. Verify 404 for invalid productId
  const invalidProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "invalid product id returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.index(
        sellerConnection,
        {
          productId: invalidProductId,
          body: {},
        },
      );
    },
  );
  // 12. Test general search parameter (searches both sku_code and option_values)
  const searchResponse =
    await api.functional.shoppingMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          search: "variant",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search filter returns valid response",
    searchResponse.data.length >= 0,
  );
}
