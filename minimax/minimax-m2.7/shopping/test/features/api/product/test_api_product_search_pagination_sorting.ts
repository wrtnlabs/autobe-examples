import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product search endpoint with sorting and pagination functionality.
 *
 * Validates the product search/patch endpoint by:
 * 1. Creating a seller account and authenticating
 * 2. Creating multiple products with varying prices
 * 3. Testing all sort options (newest, price_asc, price_desc)
 * 4. Verifying pagination with different page/limit combinations
 * 5. Validating pagination metadata accuracy
 *
 * **Sort Options Tested**:
 * - 'newest': Products ordered by created_at descending (most recent first)
 * - 'price_asc': Products ordered by base_price ascending (lowest first)
 * - 'price_desc': Products ordered by base_price descending (highest first)
 *
 * **Pagination Validation**:
 * - Page 1 and Page 2 return different sets of products
 * - OFFSET calculation: (page - 1) * limit
 * - Total records and pages match actual data
 * - Default sort is 'newest' when sort parameter is omitted
 */
export async function test_api_product_search_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create 7 products with varying prices for sorting/pagination tests
  const productPrices = [1000, 2500, 500, 3000, 1500, 800, 2000];
  const createdProducts = await Promise.all(
    productPrices.map(async (price) => {
      const product =
        await generate_random_ecommerce_mall_seller_sellers_me_products_create(
          sellerConnection,
          {
            body: {
              name: `Test Product ${price}`,
              description: `Product with price ${price}`,
              basePrice: price,
            },
          },
        );
      typia.assert(product);
      return product;
    }),
  );
  // 3. Test 'newest' sort (default) - products ordered by created_at DESC
  const newestResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "newest",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(newestResult);
  // Verify newest sort: most recently created first
  TestValidator.equals(
    "newest sort returns all products",
    newestResult.data.length,
    7,
  );
  TestValidator.predicate(
    "newest sort: first product created after or same as last",
    newestResult.data[0].createdAt >=
      newestResult.data[newestResult.data.length - 1].createdAt,
  );
  // 4. Test 'price_asc' sort - products ordered by base_price ASC
  const priceAscResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_asc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceAscResult);
  // Verify price ascending sort
  TestValidator.equals(
    "price_asc returns all products",
    priceAscResult.data.length,
    7,
  );
  for (let i = 0; i < priceAscResult.data.length - 1; i++) {
    TestValidator.predicate(
      `price_asc: product ${i} price <= product ${i + 1} price`,
      priceAscResult.data[i].basePrice <= priceAscResult.data[i + 1].basePrice,
    );
  }
  // 5. Test 'price_desc' sort - products ordered by base_price DESC
  const priceDescResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_desc",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(priceDescResult);
  // Verify price descending sort
  TestValidator.equals(
    "price_desc returns all products",
    priceDescResult.data.length,
    7,
  );
  for (let i = 0; i < priceDescResult.data.length - 1; i++) {
    TestValidator.predicate(
      `price_desc: product ${i} price >= product ${i + 1} price`,
      priceDescResult.data[i].basePrice >=
        priceDescResult.data[i + 1].basePrice,
    );
  }
  // 6. Test default sort (no sort parameter) - should behave like 'newest'
  const defaultSortResult = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(defaultSortResult);
  // Default sort should match newest sort
  TestValidator.equals(
    "default sort returns same count as newest",
    defaultSortResult.data.length,
    newestResult.data.length,
  );
  // 7. Test pagination: page=1, limit=3
  const page1Result = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_asc",
        page: 1,
        limit: 3,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page1Result);
  // Verify page 1 pagination metadata
  TestValidator.equals(
    "page 1: returns 3 products",
    page1Result.data.length,
    3,
  );
  TestValidator.equals(
    "page 1: current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1: limit is 3", page1Result.pagination.limit, 3);
  TestValidator.equals(
    "page 1: total records is 7",
    page1Result.pagination.records,
    7,
  );
  TestValidator.equals(
    "page 1: total pages is 3",
    page1Result.pagination.pages,
    3,
  );
  // 8. Test pagination: page=2, limit=3
  const page2Result = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_asc",
        page: 2,
        limit: 3,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page2Result);
  // Verify page 2 pagination metadata
  TestValidator.equals(
    "page 2: returns 3 products",
    page2Result.data.length,
    3,
  );
  TestValidator.equals(
    "page 2: current page is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2: limit is 3", page2Result.pagination.limit, 3);
  TestValidator.equals(
    "page 2: total records is 7",
    page2Result.pagination.records,
    7,
  );
  TestValidator.equals(
    "page 2: total pages is 3",
    page2Result.pagination.pages,
    3,
  );
  // Verify page 1 and page 2 have different products (no overlap)
  const page1Ids = page1Result.data.map((p) => p.id);
  const page2Ids = page2Result.data.map((p) => p.id);
  for (const id of page1Ids) {
    TestValidator.predicate(
      "page 1 and page 2 have no overlapping products",
      !page2Ids.includes(id),
    );
  }
  // Verify combined pages contain all products
  const allPageIds = [...page1Ids, ...page2Ids];
  TestValidator.equals(
    "combined pages contain all products",
    allPageIds.length,
    6,
  );
  // 9. Test pagination: page=3, limit=3 (last page with remaining items)
  const page3Result = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_asc",
        page: 3,
        limit: 3,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page3Result);
  // Verify page 3 (last page) has remaining 1 product
  TestValidator.equals("page 3: returns 1 product", page3Result.data.length, 1);
  TestValidator.equals(
    "page 3: current page is 3",
    page3Result.pagination.current,
    3,
  );
  TestValidator.equals("page 3: limit is 3", page3Result.pagination.limit, 3);
  TestValidator.equals(
    "page 3: total records is 7",
    page3Result.pagination.records,
    7,
  );
  TestValidator.equals(
    "page 3: total pages is 3",
    page3Result.pagination.pages,
    3,
  );
  // Verify page 3 products are the most expensive ones (sorted by price_asc)
  TestValidator.equals(
    "page 3 product has highest price",
    page3Result.data[0].basePrice,
    Math.max(...productPrices),
  );
  // 10. Test pagination with limit=5
  const page1Limit5 = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_desc",
        page: 1,
        limit: 5,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page1Limit5);
  const page2Limit5 = await api.functional.ecommerceMall.products.index(
    sellerConnection,
    {
      body: {
        sort: "price_desc",
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(page2Limit5);
  // Verify pagination with limit 5
  TestValidator.equals(
    "limit 5, page 1: returns 5 products",
    page1Limit5.data.length,
    5,
  );
  TestValidator.equals(
    "limit 5, page 2: returns 2 products",
    page2Limit5.data.length,
    2,
  );
  TestValidator.equals(
    "limit 5, page 1: records is 7",
    page1Limit5.pagination.records,
    7,
  );
  TestValidator.equals(
    "limit 5, page 1: pages is 2",
    page1Limit5.pagination.pages,
    2,
  );
  TestValidator.equals(
    "limit 5, page 2: records is 7",
    page2Limit5.pagination.records,
    7,
  );
  TestValidator.equals(
    "limit 5, page 2: pages is 2",
    page2Limit5.pagination.pages,
    2,
  );
  // Verify no overlap between page 1 and page 2 with limit 5
  const page1IdsLimit5 = page1Limit5.data.map((p) => p.id);
  const page2IdsLimit5 = page2Limit5.data.map((p) => p.id);
  for (const id of page1IdsLimit5) {
    TestValidator.predicate(
      "limit 5: page 1 and page 2 have no overlapping products",
      !page2IdsLimit5.includes(id),
    );
  }
  // All 7 products should be covered across both pages
  const allLimit5Ids = [...page1IdsLimit5, ...page2IdsLimit5];
  TestValidator.equals(
    "limit 5: combined pages contain all products",
    allLimit5Ids.length,
    7,
  );
  // 11. Verify prices are correctly sorted on price_desc with pagination
  for (let i = 0; i < page1Limit5.data.length - 1; i++) {
    TestValidator.predicate(
      `price_desc page 1: product ${i} price >= product ${i + 1} price`,
      page1Limit5.data[i].basePrice >= page1Limit5.data[i + 1].basePrice,
    );
  }
}
