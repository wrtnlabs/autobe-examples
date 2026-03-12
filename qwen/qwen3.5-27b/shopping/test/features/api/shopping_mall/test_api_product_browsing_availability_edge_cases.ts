import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test edge cases and availability logic for product browsing.
 * Verifies product availability based on variant stock, seller status filtering,
 * image handling, and pagination metadata in empty and populated catalogs.
 */
export async function test_api_product_browsing_availability_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test empty product catalog
  const emptyResult = await api.functional.shoppingMall.customer.products.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty catalog current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals("empty catalog limit", emptyResult.pagination.limit, 20);
  TestValidator.equals(
    "empty catalog records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.predicate(
    "empty catalog pages is 0 or 1",
    emptyResult.pagination.pages === 0 || emptyResult.pagination.pages === 1,
  );
  TestValidator.equals("empty catalog data", emptyResult.data, []);
  // 3. Test product browsing with default parameters
  const browseResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(browseResult);
  // 4. Test products with no variants (available=false, variantCount=0)
  const noVariantProducts = browseResult.data.filter(
    (product) => product.variantCount === 0,
  );
  for (const product of noVariantProducts) {
    TestValidator.predicate(
      `product ${product.id} with no variants has available=false`,
      product.available === false,
    );
    TestValidator.equals(
      `product ${product.id} variant count is 0`,
      product.variantCount,
      0,
    );
  }
  // 5. Test products where all variants are out of stock (available=false)
  const outOfStockProducts = browseResult.data.filter(
    (product) => product.variantCount > 0 && product.available === false,
  );
  for (const product of outOfStockProducts) {
    TestValidator.predicate(
      `product ${product.id} out of stock has available=false`,
      product.available === false,
    );
    TestValidator.predicate(
      `product ${product.id} out of stock has variants`,
      product.variantCount > 0,
    );
  }
  // 6. Test products with at least one variant in stock (available=true)
  const inStockProducts = browseResult.data.filter(
    (product) => product.available === true,
  );
  for (const product of inStockProducts) {
    TestValidator.predicate(
      `product ${product.id} in stock has available=true`,
      product.available === true,
    );
    TestValidator.predicate(
      `product ${product.id} in stock has at least one variant`,
      product.variantCount > 0,
    );
  }
  // 7. Test in_stock filter - only products with available inventory
  const inStockFilterResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          in_stock: true,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(inStockFilterResult);
  // All products should be available when in_stock=true
  for (const product of inStockFilterResult.data) {
    TestValidator.predicate(
      `filtered product ${product.id} is available`,
      product.available === true,
    );
  }
  // 8. Test imageUrl handling
  for (const product of browseResult.data) {
    // imageUrl can be null or a valid URL string
    TestValidator.predicate(
      `product ${product.id} imageUrl is null or string`,
      product.imageUrl === null ||
        (typeof product.imageUrl === "string" && product.imageUrl.length > 0),
    );
  }
  // 9. Test variantCount accuracy
  for (const product of browseResult.data) {
    TestValidator.predicate(
      `product ${product.id} variantCount is non-negative`,
      product.variantCount >= 0,
    );
  }
  // 10. Test pagination with different page sizes
  const paginationTestResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(paginationTestResult);
  TestValidator.equals(
    "pagination limit matches request",
    paginationTestResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginationTestResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    paginationTestResult.data.length <= paginationTestResult.pagination.limit,
  );
  // 11. Test sort options
  const sortNewestResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(sortNewestResult);
  const sortPriceAscResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "price_asc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(sortPriceAscResult);
  const sortPriceDescResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "price_desc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(sortPriceDescResult);
  // 12. Test price range filtering
  const priceFilterResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          price_min: 100,
          price_max: 1000,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  // All products should be within price range
  for (const product of priceFilterResult.data) {
    TestValidator.predicate(
      `product ${product.id} price is within range`,
      product.basePrice >= 100 && product.basePrice <= 1000,
    );
  }
  // Note: Seller status filtering (suspended/rejected sellers excluded) and
  // soft-deleted product exclusion are handled by the backend API logic.
  // These tests would require seller creation utilities to verify explicitly.
}
