import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test all available product catalog sorting options including price
 * directions, popularity ratings, newest arrivals, and relevance scoring.
 * Validates marketplace UX by ensuring customers can sort results according to
 * their preference for better product discovery. Covers sorting by
 * 'price_low_to_high' for budget-conscious shopping and 'rating' for
 * quality-first decisions among other options.
 */
export async function test_api_product_catalog_sorting_options(
  connection: api.IConnection,
) {
  // Create test scenario with multiple products for sorting validation
  // Step 1: Test price-based sorting with ascending order
  const priceLowToHighRequest = {
    page: 1,
    limit: 20,
    sortBy: "price_low_to_high",
    orderBy: "asc",
    minPrice: typia.random<number & tags.Minimum<10> & tags.Maximum<50>>(),
    maxPrice: typia.random<number & tags.Minimum<100> & tags.Maximum<500>>(),
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const priceLowToHighResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: priceLowToHighRequest,
    });
  typia.assert(priceLowToHighResponse);

  // Validate products are sorted by ascending price
  for (let i = 1; i < priceLowToHighResponse.data.length; i++) {
    TestValidator.predicate(
      "Price should be sorted ascending",
      priceLowToHighResponse.data[i - 1].price <=
        priceLowToHighResponse.data[i].price,
    );
  }

  // Step 2: Test price high to low sorting with descending order
  const priceHighToLowRequest = {
    page: 1,
    limit: 20,
    sortBy: "price_high_to_low",
    orderBy: "desc",
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const priceHighToLowResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: priceHighToLowRequest,
    });
  typia.assert(priceHighToLowResponse);

  // Validate products are sorted by descending price
  for (let i = 1; i < priceHighToLowResponse.data.length; i++) {
    TestValidator.predicate(
      "Price should be sorted descending",
      priceHighToLowResponse.data[i - 1].price >=
        priceHighToLowResponse.data[i].price,
    );
  }

  // Step 3: Test alphabetical sorting by name
  const nameSortingRequest = {
    page: 1,
    limit: 15,
    sortBy: "name",
    orderBy: "asc",
    includeOutOfStock: true,
  } satisfies IShoppingMallProduct.IRequest;

  const nameSortingResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: nameSortingRequest },
  );
  typia.assert(nameSortingResponse);

  // Validate alphabetical sorting
  for (let i = 1; i < nameSortingResponse.data.length; i++) {
    TestValidator.predicate(
      "Products should be sorted alphabetically by name",
      nameSortingResponse.data[i - 1].name.toLowerCase() <=
        nameSortingResponse.data[i].name.toLowerCase(),
    );
  }

  // Step 4: Test newest products sorting
  const newestRequest = {
    page: 1,
    limit: 25,
    sortBy: "newest",
    orderBy: "desc",
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const newestResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: newestRequest },
  );
  typia.assert(newestResponse);

  // Step 5: Test popularity-based sorting
  const popularityRequest = {
    page: 1,
    limit: 30,
    sortBy: "popularity",
    orderBy: "desc",
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const popularityResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: popularityRequest },
  );
  typia.assert(popularityResponse);

  // Step 6: Test rating-based sorting for quality-first preferences
  const ratingRequest = {
    page: 1,
    limit: 20,
    sortBy: "rating",
    orderBy: "desc",
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const ratingResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: ratingRequest },
  );
  typia.assert(ratingResponse);

  // Step 7: Test relevance sorting (default behavior)
  const relevanceRequest = {
    page: 1,
    limit: 15,
    sortBy: "relevance",
    orderBy: "desc",
    search: RandomGenerator.name(),
    includeOutOfStock: true,
  } satisfies IShoppingMallProduct.IRequest;

  const relevanceResponse = await api.functional.shoppingMall.products.index(
    connection,
    { body: relevanceRequest },
  );
  typia.assert(relevanceResponse);

  // Step 8: Test combined filtering with sorting - budget-conscious category browsing
  const budgetCategoryRequest = {
    page: 1,
    limit: 18,
    sortBy: "price_low_to_high",
    orderBy: "asc",
    search: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    minPrice: 1,
    maxPrice: 75,
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const budgetCategoryResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: budgetCategoryRequest,
    });
  typia.assert(budgetCategoryResponse);

  // Validate price range constraint
  budgetCategoryResponse.data.forEach((product) => {
    TestValidator.predicate(
      "Product price within budget range",
      product.price >= budgetCategoryRequest.minPrice! &&
        product.price <= budgetCategoryRequest.maxPrice!,
    );
  });

  // Step 9: Test premium products with high ratings and higher price points
  const premiumQualityRequest = {
    page: 1,
    limit: 12,
    sortBy: "rating",
    orderBy: "desc",
    minPrice: 100,
    includeOutOfStock: false,
  } satisfies IShoppingMallProduct.IRequest;

  const premiumQualityResponse =
    await api.functional.shoppingMall.products.index(connection, {
      body: premiumQualityRequest,
    });
  typia.assert(premiumQualityResponse);

  // Validate all products meet premium price threshold
  premiumQualityResponse.data.forEach((product) => {
    TestValidator.predicate(
      "Product meets premium price threshold",
      product.price >= premiumQualityRequest.minPrice!,
    );
  });

  // Step 10: Test complete sorting validation - verify all available sortBy options work
  const availableSortOptions = [
    "name",
    "price_low_to_high",
    "price_high_to_low",
    "newest",
    "popularity",
    "rating",
    "relevance",
  ] as const;

  await ArrayUtil.asyncForEach(availableSortOptions, async (sortOption) => {
    const sortTestRequest = {
      page: 1,
      limit: 10,
      sortBy: sortOption,
      orderBy: "desc" as const,
      includeOutOfStock: false,
    } satisfies IShoppingMallProduct.IRequest;

    const sortTestResponse = await api.functional.shoppingMall.products.index(
      connection,
      { body: sortTestRequest },
    );
    typia.assert(sortTestResponse);

    TestValidator.predicate(
      `Sort option ${sortOption} returns valid product data`,
      sortTestResponse.data.length > 0,
    );
  });
}
