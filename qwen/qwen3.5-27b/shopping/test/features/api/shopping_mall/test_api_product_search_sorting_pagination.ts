import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test product search sorting and pagination functionality for sellers.
 *
 * Validates that sellers can sort their product listings by various criteria (name, price, creation date) and paginate through results correctly. Tests alphabetical sorting, price-based sorting (ascending and descending), newest-first sorting, and pagination metadata accuracy.
 *
 * The test verifies sorting behavior by checking product sequences in API responses, then validates that pagination returns correct products on each page with accurate pagination metadata. Search filtering is also tested in combination with sorting to ensure both features work together.
 *
 * 1. Register and authenticate as a seller using authorize_seller_join utility.
 * 2. Test alphabetical sorting by name (ascending and descending).
 * 3. Test price sorting (ascending and descending).
 * 4. Test newest-first sorting by creation date.
 * 5. Test pagination by requesting page 1 and page 2 with pageSize=5.
 * 6. Verify pagination metadata (current, limit, records, pages) accuracy.
 * 7. Test search filter combined with sorting to ensure filtering works with sort options.
 */
export async function test_api_product_search_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(seller);
  // 2. Test alphabetical sorting by name (ascending)
  const nameAscResult = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Validate alphabetical ascending order
  if (nameAscResult.data.length > 1) {
    for (let i = 0; i < nameAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `name ascending order at index ${i}`,
        nameAscResult.data[i].name.localeCompare(
          nameAscResult.data[i + 1].name,
        ) <= 0,
      );
    }
  }
  // 3. Test alphabetical sorting by name (descending)
  const nameDescResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        sortBy: "name",
        sortOrder: "desc",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(nameDescResult);
  // Validate alphabetical descending order
  if (nameDescResult.data.length > 1) {
    for (let i = 0; i < nameDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `name descending order at index ${i}`,
        nameDescResult.data[i].name.localeCompare(
          nameDescResult.data[i + 1].name,
        ) >= 0,
      );
    }
  }
  // 4. Test price sorting (ascending)
  const priceAscResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        sortBy: "price_asc",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceAscResult);
  // Validate price ascending order
  if (priceAscResult.data.length > 1) {
    for (let i = 0; i < priceAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        `price ascending order at index ${i}`,
        priceAscResult.data[i].base_price <=
          priceAscResult.data[i + 1].base_price,
      );
    }
  }
  // 5. Test price sorting (descending)
  const priceDescResult =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: {
        sortBy: "price_desc",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(priceDescResult);
  // Validate price descending order
  if (priceDescResult.data.length > 1) {
    for (let i = 0; i < priceDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        `price descending order at index ${i}`,
        priceDescResult.data[i].base_price >=
          priceDescResult.data[i + 1].base_price,
      );
    }
  }
  // 6. Test newest-first sorting
  const newestResult = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        sortBy: "newest",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(newestResult);
  // Validate newest-first order (created_at descending)
  if (newestResult.data.length > 1) {
    for (let i = 0; i < newestResult.data.length - 1; i++) {
      TestValidator.predicate(
        `newest order at index ${i}`,
        new Date(newestResult.data[i].created_at).getTime() >=
          new Date(newestResult.data[i + 1].created_at).getTime(),
      );
    }
  }
  // 7. Test pagination with pageSize=5
  const page1Result = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        page: 1,
        pageSize: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page1Result);
  const page2Result = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        page: 2,
        pageSize: 5,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(page2Result);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate("page 1 has data", page1Result.data.length > 0);
  TestValidator.predicate(
    "page 1 data count <= limit",
    page1Result.data.length <= 5,
  );
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 data count <= limit",
    page2Result.data.length <= 5,
  );
  // Validate total records consistency
  TestValidator.equals(
    "total records consistent",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // Validate pages calculation
  const expectedPages = Math.ceil(page1Result.pagination.records / 5);
  TestValidator.equals(
    "pages calculation",
    page1Result.pagination.pages,
    expectedPages,
  );
  // Validate that page 1 and page 2 have different products (no overlap)
  const page1Ids = new Set(page1Result.data.map((p) => p.id));
  const page2Overlap = page2Result.data.filter((p) => page1Ids.has(p.id));
  TestValidator.equals("no overlap between pages", page2Overlap.length, 0);
  // 8. Test search filter combined with sorting
  const searchResult = await api.functional.shoppingMall.seller.products.index(
    sellerConnection,
    {
      body: {
        search: "Product",
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        pageSize: 20,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(searchResult);
  // Validate that all results contain the search term
  for (const product of searchResult.data) {
    TestValidator.predicate(
      `product name contains search term: ${product.id}`,
      product.name.toLowerCase().includes("product"),
    );
  }
  // Validate that search results are still sorted alphabetically
  if (searchResult.data.length > 1) {
    for (let i = 0; i < searchResult.data.length - 1; i++) {
      TestValidator.predicate(
        `search result ascending order at index ${i}`,
        searchResult.data[i].name.localeCompare(
          searchResult.data[i + 1].name,
        ) <= 0,
      );
    }
  }
}
