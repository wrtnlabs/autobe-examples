import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export async function test_api_shopping_mall_product_filtered_pagination_public_access(
  connection: api.IConnection,
) {
  // 1. Basic retrieval without filters to get baseline data
  const baselineResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: {} satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(baselineResponse);
  TestValidator.predicate(
    "basic retrieval returns data",
    baselineResponse.data.length > 0,
  );
  TestValidator.predicate(
    "pagination pages computed correctly",
    baselineResponse.pagination.pages >= 1,
  );

  // 2. Filtering by categoryCode (cannot verify product's categoryCode directly)
  const categoryCode = baselineResponse.data[0]?.code ?? "";
  const filterByCategoryBody = {
    categoryCode,
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const filterByCategoryResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: filterByCategoryBody,
    });
  typia.assert(filterByCategoryResponse);
  TestValidator.predicate(
    "filter by categoryCode returns data",
    filterByCategoryResponse.data.length > 0,
  );

  // 3. Filtering by sellerCode (cannot verify sellerCode in response properties)
  const sellerCode = baselineResponse.data[0]?.code ?? "";
  const filterBySellerBody = {
    sellerCode,
    limit: 3,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const filterBySellerResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: filterBySellerBody,
    });
  typia.assert(filterBySellerResponse);

  // 4. Filtering by price range minPrice and maxPrice - test only request compliance
  const priceRangeBody = {
    minPrice: 0,
    maxPrice: 1000000,
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const filterPriceRangeResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: priceRangeBody,
    });
  typia.assert(filterPriceRangeResponse);

  // 5. Filtering with inStockOnly true and includeDiscontinued false
  const filterInStockBody = {
    inStockOnly: true,
    includeDiscontinued: false,
    limit: 4,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const filterInStockResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: filterInStockBody,
    });
  typia.assert(filterInStockResponse);

  // 6. Test sorting by price asc
  const sortByPriceAscBody = {
    sortBy: "price",
    sortOrder: "asc",
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const sortByPriceAsc: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: sortByPriceAscBody,
    });
  typia.assert(sortByPriceAsc);

  // 7. Test sorting by name desc
  const sortByNameDescBody = {
    sortBy: "name",
    sortOrder: "desc",
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const sortByNameDesc: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: sortByNameDescBody,
    });
  typia.assert(sortByNameDesc);

  // 8. Test sorting by createdAt desc
  const sortByCreatedAtDescBody = {
    sortBy: "createdAt",
    sortOrder: "desc",
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const sortByCreatedAtDesc: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: sortByCreatedAtDescBody,
    });
  typia.assert(sortByCreatedAtDesc);

  // 9. Test pagination: request page 2 with limit
  const paginationPage2Body = {
    limit: 3,
    page: 2,
  } satisfies IShoppingMallProduct.IRequest;
  const page2Response: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: paginationPage2Body,
    });
  typia.assert(page2Response);
  TestValidator.predicate(
    "page 2 returns data length within limit",
    page2Response.data.length <= 3,
  );

  // 10. Test filter with empty results - using unlikely category code
  const unlikelyCategoryBody = {
    categoryCode: "NON_EXISTENT_CATEGORY_CODE",
    limit: 5,
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;
  const unlikelyCategoryResponse: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.shoppingMallProducts.index(connection, {
      body: unlikelyCategoryBody,
    });
  typia.assert(unlikelyCategoryResponse);
  TestValidator.predicate(
    "empty result for unlikely category",
    unlikelyCategoryResponse.data.length === 0,
  );
}
