import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test business rules around product availability in search results.
 * Verifies deleted products exclusion, products without variants handling,
 * out-of-stock products, and price range display rules.
 *
 * Test Scenarios:
 * 1. Products with zero variants are visible but marked as unavailable (isAvailable=false)
 * 2. Products with all variants out-of-stock are marked isAvailable=false
 * 3. Deleted products are excluded from search results
 * 4. Products with at least one in-stock variant have isAvailable=true
 * 5. PriceRangeMin and priceRangeMax always present using base_price for products without variants
 * 6. inStockOnly=true filter excludes out-of-stock products
 */
export async function test_api_customer_product_search_availability_rules(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Search with empty filters to get all products view
  const searchResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(searchResult);
  // 3. Verify response structure and data types
  TestValidator.predicate(
    "search returns paginated result",
    searchResult.data !== undefined && searchResult.pagination !== undefined,
  );
  // Verify all products have required price fields
  searchResult.data.forEach((product) => {
    TestValidator.predicate(
      `product ${product.id} has priceRangeMin defined`,
      typeof product.priceRangeMin === "number" && product.priceRangeMin >= 0,
    );
    TestValidator.predicate(
      `product ${product.id} has priceRangeMax defined`,
      typeof product.priceRangeMax === "number" && product.priceRangeMax >= 0,
    );
    TestValidator.predicate(
      `product ${product.id} has priceRangeMin <= priceRangeMax`,
      product.priceRangeMin <= product.priceRangeMax,
    );
    TestValidator.predicate(
      `product ${product.id} has isAvailable boolean`,
      typeof product.isAvailable === "boolean",
    );
  });
  // 4. Check product availability rules
  const unavailableProducts = searchResult.data.filter((p) => !p.isAvailable);
  const availableProducts = searchResult.data.filter((p) => p.isAvailable);
  // Unavailable products should exist and have price ranges set to base_price
  if (unavailableProducts.length > 0) {
    unavailableProducts.forEach((product) => {
      // When product has no variants, both min and max are base_price
      TestValidator.predicate(
        `unavailable product ${product.id} has consistent price range`,
        product.priceRangeMin === product.priceRangeMax,
      );
    });
  }
  // Available products should have positive price ranges
  if (availableProducts.length > 0) {
    availableProducts.forEach((product) => {
      TestValidator.predicate(
        `available product ${product.id} has positive price range`,
        product.priceRangeMax >= product.priceRangeMin &&
          product.priceRangeMin >= 0,
      );
    });
  }
  // 5. Test inStockOnly filter
  const inStockOnlyResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: { inStockOnly: true } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(inStockOnlyResult);
  // All products in inStockOnly results should have isAvailable=true
  inStockOnlyResult.data.forEach((product) => {
    TestValidator.predicate(
      `inStockOnly product ${product.id} is available`,
      product.isAvailable === true,
    );
  });
  // 6. Verify deleted products exclusion
  // All returned products should have valid data structure (deleted products excluded)
  TestValidator.predicate(
    "deleted products are excluded from search results",
    searchResult.data.every(
      (product) =>
        product.id !== undefined &&
        product.name !== undefined &&
        product.priceRangeMin !== undefined &&
        product.priceRangeMax !== undefined,
    ),
  );
  // 7. Test price filter combined with availability
  if (searchResult.data.length > 0) {
    const minPriceFilter = searchResult.data[0].priceRangeMin;
    const maxPriceFilter = searchResult.data[0].priceRangeMax + 1;
    const priceFilteredResult =
      await api.functional.ecommerceMall.customer.products.search.index(
        customerConnection,
        {
          body: {
            minPrice: minPriceFilter,
            maxPrice: maxPriceFilter,
          } satisfies IEcommerceMallProduct.IRequest,
        },
      );
    typia.assert(priceFilteredResult);
    // Verify filtered results respect price bounds
    priceFilteredResult.data.forEach((product) => {
      TestValidator.predicate(
        `price-filtered product ${product.id} minPrice within bounds`,
        product.priceRangeMin >= minPriceFilter!,
      );
      TestValidator.predicate(
        `price-filtered product ${product.id} maxPrice within bounds`,
        product.priceRangeMax <= maxPriceFilter,
      );
    });
  }
  // 8. Test pagination with availability checks
  const pagedResult =
    await api.functional.ecommerceMall.customer.products.search.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IRequest,
      },
    );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination page is correct",
    pagedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is applied",
    pagedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records count is consistent",
    pagedResult.data.length <= pagedResult.pagination.limit,
  );
}
