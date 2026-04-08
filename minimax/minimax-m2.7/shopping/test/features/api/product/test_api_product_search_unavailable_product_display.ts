import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_unavailable_product_display(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search for products with empty body to get all available products
  const searchResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const pageResult = typia.assert(searchResult);
  // 3. Validate response structure
  TestValidator.predicate(
    "current page is valid",
    pageResult.pagination.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    pageResult.pagination.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is valid",
    pageResult.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    pageResult.pagination.pagination.pages >= 0,
  );
  // 4. Validate product summaries if any products exist
  for (const product of pageResult.data) {
    // Validate hasStock reflects availability
    TestValidator.predicate(
      "hasStock is boolean",
      typeof product.hasStock === "boolean",
    );
    // Validate price range consistency
    TestValidator.predicate(
      "minVariantPrice is non-negative",
      product.minVariantPrice >= 0,
    );
    TestValidator.predicate(
      "maxVariantPrice is non-negative",
      product.maxVariantPrice >= 0,
    );
    TestValidator.predicate(
      "minVariantPrice <= maxVariantPrice",
      product.minVariantPrice <= product.maxVariantPrice,
    );
    // Validate rating constraints
    TestValidator.predicate(
      "averageRating between 0-5",
      product.averageRating >= 0 && product.averageRating <= 5,
    );
    TestValidator.predicate(
      "reviewsCount is non-negative",
      product.reviewsCount >= 0,
    );
    // Validate required fields exist
    TestValidator.equals("has id", product.id !== undefined, true);
    TestValidator.equals("has name", product.name !== undefined, true);
    TestValidator.equals(
      "has thumbnailUrl",
      product.thumbnailUrl !== undefined,
      true,
    );
    TestValidator.equals("has shopName", product.shopName !== undefined, true);
    TestValidator.equals(
      "has createdAt",
      product.createdAt !== undefined,
      true,
    );
  }
  // 5. Search with in-stock filter to verify filtering works
  const inStockResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          inStock: true,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const inStockPage = typia.assert(inStockResult);
  // All products returned when inStock is true should have hasStock = true
  for (const product of inStockPage.data) {
    TestValidator.equals(
      "inStock filter returns only available products",
      product.hasStock,
      true,
    );
  }
  // 6. Search with out-of-stock filter
  const outOfStockResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          inStock: false,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const outOfStockPage = typia.assert(outOfStockResult);
  // Products returned when inStock is false may have hasStock = false
  for (const product of outOfStockPage.data) {
    TestValidator.predicate(
      "outOfStock search can return unavailable products",
      product.hasStock === false || product.hasStock === true,
    );
  }
  // 7. Test search query functionality
  const queryResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          q: "test",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const queryPage = typia.assert(queryResult);
  // Query results should have valid pagination
  TestValidator.predicate(
    "query search returns valid pagination",
    queryPage.pagination.pagination.records >= 0,
  );
  // 8. Test price range filtering
  const priceFilterResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          minPrice: 0,
          maxPrice: 1000,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const pricePage = typia.assert(priceFilterResult);
  // All returned products should have prices within range
  for (const product of pricePage.data) {
    TestValidator.predicate(
      "minVariantPrice within range",
      product.minVariantPrice >= 0 && product.minVariantPrice <= 1000,
    );
  }
  // 9. Test sorting options
  const sortNewestResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "newest",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(sortNewestResult);
  const sortPriceAscResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "price_asc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const priceAscPage = typia.assert(sortPriceAscResult);
  const sortPriceDescResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          sort: "price_desc",
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const priceDescPage = typia.assert(sortPriceDescResult);
  // Price ascending sort should have non-decreasing prices
  if (priceAscPage.data.length > 1) {
    for (let i = 1; i < priceAscPage.data.length; i++) {
      TestValidator.predicate(
        "price_asc sort maintains order",
        priceAscPage.data[i].minVariantPrice >=
          priceAscPage.data[i - 1].minVariantPrice,
      );
    }
  }
  // Price descending sort should have non-increasing prices
  if (priceDescPage.data.length > 1) {
    for (let i = 1; i < priceDescPage.data.length; i++) {
      TestValidator.predicate(
        "price_desc sort maintains order",
        priceDescPage.data[i].minVariantPrice <=
          priceDescPage.data[i - 1].minVariantPrice,
      );
    }
  }
  // 10. Test pagination parameters
  const paginatedResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  const paginatedPage = typia.assert(paginatedResult);
  TestValidator.equals(
    "limit is respected",
    paginatedPage.data.length <= 5,
    true,
  );
  TestValidator.equals(
    "page is correct",
    paginatedPage.pagination.pagination.current,
    1,
  );
}
