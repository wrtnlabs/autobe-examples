import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test product listing stock availability filtering functionality.
 *
 * This test validates the in_stock filter parameter in the product listing endpoint:
 * 1. Tests in_stock=true filter - should only return products with available stock
 * 2. Tests in_stock=false filter - should include products regardless of stock status
 * 3. Tests without in_stock parameter - default behavior
 * 4. Validates response structure and pagination metadata
 * 5. Verifies product summaries contain expected fields
 */
export async function test_api_product_listing_stock_availability_filter(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: in_stock=true filter
  const inStockRequest: IEcommerceMallProduct.IRequest = {
    in_stock: true,
    page: 1,
    limit: 20,
    sort: "newest" as const,
  };
  const inStockResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: inStockRequest,
    });
  typia.assert(inStockResponse);
  // Validate response structure
  TestValidator.equals(
    "in_stock=true pagination current",
    inStockResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "in_stock=true pagination limit",
    inStockResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "in_stock=true has non-negative records",
    inStockResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "in_stock=true has non-negative pages",
    inStockResponse.pagination.pages >= 0,
  );
  // Validate product summaries have required fields
  if (inStockResponse.data.length > 0) {
    const firstProduct = inStockResponse.data[0];
    typia.assert(firstProduct);
    TestValidator.predicate(
      "product has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstProduct.id,
      ),
    );
    TestValidator.predicate(
      "product has non-empty name",
      firstProduct.name.length > 0,
    );
    TestValidator.predicate(
      "product has positive base price",
      firstProduct.basePrice >= 0,
    );
    TestValidator.predicate(
      "product has valid URL",
      firstProduct.mainImageUrl.length > 0,
    );
    TestValidator.predicate(
      "product has non-negative rating",
      firstProduct.averageRating >= 0,
    );
    TestValidator.predicate(
      "product has non-negative review count",
      firstProduct.reviewCount >= 0,
    );
  }
  // Test 2: in_stock=false filter
  const outOfStockRequest: IEcommerceMallProduct.IRequest = {
    in_stock: false,
    page: 1,
    limit: 20,
    sort: "newest" as const,
  };
  const outOfStockResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: outOfStockRequest,
    });
  typia.assert(outOfStockResponse);
  // Validate response structure for in_stock=false
  TestValidator.equals(
    "in_stock=false pagination current",
    outOfStockResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "in_stock=false pagination limit",
    outOfStockResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "in_stock=false has non-negative records",
    outOfStockResponse.pagination.records >= 0,
  );
  // Test 3: No in_stock filter (default behavior)
  const defaultRequest: IEcommerceMallProduct.IRequest = {
    page: 1,
    limit: 20,
    sort: "newest" as const,
  };
  const defaultResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);
  // Validate response structure for default request
  TestValidator.equals(
    "default pagination current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default has non-negative records",
    defaultResponse.pagination.records >= 0,
  );
  // Test 4: Price range filter combined with in_stock
  const priceRangeRequest: IEcommerceMallProduct.IRequest = {
    in_stock: true,
    min_price: 0,
    max_price: 100000,
    page: 1,
    limit: 20,
    sort: "price_asc" as const,
  };
  const priceRangeResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: priceRangeRequest,
    });
  typia.assert(priceRangeResponse);
  // Validate price filtering
  if (priceRangeResponse.data.length > 0) {
    const allPricesInRange = priceRangeResponse.data.every(
      (product) => product.basePrice >= 0 && product.basePrice <= 100000,
    );
    TestValidator.predicate(
      "all products within price range",
      allPricesInRange,
    );
    // Validate sorting (price ascending)
    if (priceRangeResponse.data.length > 1) {
      let isSorted = true;
      for (let i = 1; i < priceRangeResponse.data.length; i++) {
        if (
          priceRangeResponse.data[i - 1].basePrice >
          priceRangeResponse.data[i].basePrice
        ) {
          isSorted = false;
          break;
        }
      }
      TestValidator.predicate("products sorted by price ascending", isSorted);
    }
  }
  // Test 5: Different sorting options
  const newestRequest: IEcommerceMallProduct.IRequest = {
    in_stock: true,
    sort: "newest" as const,
    page: 1,
    limit: 20,
  };
  const newestResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: newestRequest,
    });
  typia.assert(newestResponse);
  const priceDescRequest: IEcommerceMallProduct.IRequest = {
    in_stock: true,
    sort: "price_desc" as const,
    page: 1,
    limit: 20,
  };
  const priceDescResponse: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.products.index(connection, {
      body: priceDescRequest,
    });
  typia.assert(priceDescResponse);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination current >= 0",
    newestResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    newestResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    newestResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    newestResponse.pagination.pages >= 0,
  );
}
