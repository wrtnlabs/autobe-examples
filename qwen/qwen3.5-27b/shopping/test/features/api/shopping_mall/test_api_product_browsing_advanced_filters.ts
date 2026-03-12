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
 * Test comprehensive filtering and sorting capabilities for product browsing.
 * 1. Authenticate as customer
 * 2. Test search by product name with partial matching
 * 3. Test category filtering
 * 4. Test price range filtering (min/max)
 * 5. Test in_stock filter
 * 6. Test sorting options (newest, price_asc, price_desc)
 * 7. Test pagination with custom parameters
 * 8. Test combined filters (category + price + in_stock)
 * 9. Validate pagination metadata accuracy
 */
export async function test_api_product_browsing_advanced_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
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
  // 2. Test search by product name with partial matching
  const searchQuery = RandomGenerator.alphabets(5);
  const searchResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          search: searchQuery,
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns valid pagination",
    searchResult.pagination.records >= 0,
  );
  // 3. Test category filtering
  const categoryFilterResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(categoryFilterResult);
  TestValidator.predicate(
    "category filter returns valid response",
    categoryFilterResult.pagination.current >= 1,
  );
  // 4. Test price range filtering
  const priceMin = typia.random<number>();
  const priceMax = typia.random<number>();
  const priceFilterResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          price_min: priceMin,
          price_max: priceMax,
          limit: 15,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  TestValidator.predicate(
    "price filter returns valid pagination",
    priceFilterResult.pagination.pages >= 0,
  );
  // Validate all products in result are within price range
  for (const product of priceFilterResult.data) {
    TestValidator.predicate(
      `product price within range [${priceMin}, ${priceMax}]`,
      product.basePrice >= priceMin && product.basePrice <= priceMax,
    );
  }
  // 5. Test in_stock filter
  const inStockResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          in_stock: true,
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(inStockResult);
  TestValidator.predicate(
    "in_stock filter returns valid response",
    inStockResult.pagination.current >= 1,
  );
  // Validate all products are marked as available
  for (const product of inStockResult.data) {
    TestValidator.predicate(
      "product is available when in_stock=true",
      product.available === true,
    );
  }
  // 6. Test sorting options
  // Test newest sorting
  const newestResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "newest",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(newestResult);
  TestValidator.predicate(
    "newest sort returns valid response",
    newestResult.pagination.records >= 0,
  );
  // Test price ascending sorting
  const priceAscResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "price_asc",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceAscResult);
  TestValidator.predicate(
    "price_asc sort returns valid response",
    priceAscResult.pagination.records >= 0,
  );
  // Validate price ascending order
  for (let i = 1; i < priceAscResult.data.length; i++) {
    TestValidator.predicate(
      `price ascending order at index ${i}`,
      priceAscResult.data[i - 1].basePrice <= priceAscResult.data[i].basePrice,
    );
  }
  // Test price descending sorting
  const priceDescResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          sort: "price_desc",
          limit: 10,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(priceDescResult);
  TestValidator.predicate(
    "price_desc sort returns valid response",
    priceDescResult.pagination.records >= 0,
  );
  // Validate price descending order
  for (let i = 1; i < priceDescResult.data.length; i++) {
    TestValidator.predicate(
      `price descending order at index ${i}`,
      priceDescResult.data[i - 1].basePrice >=
        priceDescResult.data[i].basePrice,
    );
  }
  // 7. Test pagination with custom parameters
  const page = typia.random<number>();
  const limit = typia.random<number>();
  const paginationResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: page,
          limit: limit,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "current page matches request",
    paginationResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "limit matches request",
    paginationResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginationResult.data.length <= limit,
  );
  // 8. Test combined filters (category + price range + in_stock)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const combinedMinPrice = typia.random<number>();
  const combinedMaxPrice = typia.random<number>();
  const combinedResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          category_id: categoryId,
          price_min: combinedMinPrice,
          price_max: combinedMaxPrice,
          in_stock: true,
          limit: 20,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedResult.pagination.current >= 1,
  );
  // Validate all products meet all filter criteria
  for (const product of combinedResult.data) {
    TestValidator.predicate(
      `product in category ${categoryId}`,
      product.category.id === categoryId,
    );
    TestValidator.predicate(
      `product price within combined range [${combinedMinPrice}, ${combinedMaxPrice}]`,
      product.basePrice >= combinedMinPrice &&
        product.basePrice <= combinedMaxPrice,
    );
    TestValidator.predicate(
      "product is available in combined filter",
      product.available === true,
    );
  }
  // 9. Validate pagination metadata accuracy
  const fullPaginationResult =
    await api.functional.shoppingMall.customer.products.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(fullPaginationResult);
  TestValidator.predicate(
    "pagination records is non-negative",
    fullPaginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    fullPaginationResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    fullPaginationResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    fullPaginationResult.pagination.limit === 100,
  );
  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    fullPaginationResult.pagination.records === 0
      ? 0
      : Math.ceil(
          fullPaginationResult.pagination.records /
            fullPaginationResult.pagination.limit,
        );
  TestValidator.equals(
    "pages calculation is correct",
    fullPaginationResult.pagination.pages,
    expectedPages,
  );
}
