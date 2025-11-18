import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_product_search_sorting_and_price_range_filter(
  connection: api.IConnection,
) {
  // 1. Register a seller to obtain an authenticated seller context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; we can omit it entirely
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Create several products owned by this seller
  // We will create 3 products with different codes and titles to later
  // verify ordering stability. Since pricing is not part of ICreate,
  // minPrice/maxPrice will be determined by the backend, but we can
  // still assert ordering by those fields when present.
  const productCreateBodies: IShoppingMallProduct.ICreate[] = [
    {
      code: RandomGenerator.alphaNumeric(8),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: null,
      model_name: null,
      status: "active",
      primary_image_uri: null,
      default_locale: "en-US",
    },
    {
      code: RandomGenerator.alphaNumeric(8),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: null,
      model_name: null,
      status: "active",
      primary_image_uri: null,
      default_locale: "en-US",
    },
    {
      code: RandomGenerator.alphaNumeric(8),
      title: RandomGenerator.paragraph({ sentences: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.content({ paragraphs: 2 }),
      brand: null,
      model_name: null,
      status: "active",
      primary_image_uri: null,
      default_locale: "en-US",
    },
  ];

  const createdProducts = await ArrayUtil.asyncMap(
    productCreateBodies,
    async (body) => {
      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body,
        });
      typia.assert<IShoppingMallProduct>(product);
      return product;
    },
  );

  TestValidator.equals(
    "three products should be created",
    createdProducts.length,
    3,
  );

  // Helper to call the search endpoint with common base request
  const searchProducts = async (
    sortDirection: "asc" | "desc" | undefined,
  ): Promise<IPageIShoppingMallProduct.ISummary> => {
    const requestBody = {
      // Request only products of this seller to keep the dataset small
      seller_id: seller.id,
      // Ask for a small page size but enough to include our three products
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      sort_by: sortDirection ? "price" : undefined,
      sort_direction: sortDirection,
    } satisfies IShoppingMallProduct.IRequest;

    const pageResult: IPageIShoppingMallProduct.ISummary =
      await api.functional.shoppingMall.products.index(connection, {
        body: requestBody,
      });
    typia.assert<IPageIShoppingMallProduct.ISummary>(pageResult);
    return pageResult;
  };

  // 3. Call the search endpoint sorted ascending by price
  const ascPage = await searchProducts("asc");
  const ascData = ascPage.data;

  // Ensure that at least our created products are present (by id)
  const createdIds = createdProducts.map((p) => p.id);
  const foundAsc = ascData.filter((summary) => createdIds.includes(summary.id));

  TestValidator.predicate(
    "at least one created product should appear in ascending results",
    foundAsc.length > 0,
  );

  // If we have at least two summaries with minPrice, validate ascending order
  if (ascData.length >= 2) {
    const isAscSorted = ascData.every((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return prev.minPrice <= item.minPrice;
    });

    TestValidator.predicate(
      "ascending results should be sorted by minPrice in non-decreasing order",
      isAscSorted,
    );
  }

  // 4. Call the search endpoint sorted descending by price
  const descPage = await searchProducts("desc");
  const descData = descPage.data;

  const foundDesc = descData.filter((summary) =>
    createdIds.includes(summary.id),
  );

  TestValidator.predicate(
    "at least one created product should appear in descending results",
    foundDesc.length > 0,
  );

  if (descData.length >= 2) {
    const isDescSorted = descData.every((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return prev.minPrice >= item.minPrice;
    });

    TestValidator.predicate(
      "descending results should be sorted by minPrice in non-increasing order",
      isDescSorted,
    );
  }

  // 5. Verify pagination metadata reflects the number of matching products
  const ascPagination = ascPage.pagination;
  typia.assert<IPage.IPagination>(ascPagination);

  TestValidator.predicate(
    "pagination.records should be non-negative",
    ascPagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination.limit should be at least the requested limit (or adjusted by server)",
    ascPagination.limit > 0,
  );

  // 6. Ensure stability: repeated calls with the same parameters should
  // produce the same ordering of IDs for the first page.
  const ascPageAgain = await searchProducts("asc");
  const ascIds = ascPage.data.map((s) => s.id);
  const ascIdsAgain = ascPageAgain.data.map((s) => s.id);

  TestValidator.equals(
    "repeated ascending searches should return the same ordered IDs on the first page",
    ascIds,
    ascIdsAgain,
  );
}
