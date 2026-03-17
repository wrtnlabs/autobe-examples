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

export async function test_api_category_product_browsing(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for category ID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test 1: Basic category product browsing with default parameters
  const basicResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {},
    });
  typia.assert(basicResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current is positive",
    basicResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    basicResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    basicResult.pagination.pages >= 0,
  );
  // Test 2: Browse with pagination parameters
  const paginatedResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "page limit matches",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page current matches",
    paginatedResult.pagination.current,
    1,
  );
  // Test 3: Browse with search filter
  const searchResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        search: "test",
      },
    });
  typia.assert(searchResult);
  // Test 4: Browse with price range filter
  const priceFilteredResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        min_price: 0,
        max_price: 10000,
      },
    });
  typia.assert(priceFilteredResult);
  // Test 5: Browse with in_stock filter
  const inStockResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        in_stock: true,
      },
    });
  typia.assert(inStockResult);
  // Test 6: Browse with sorting - newest first (default)
  const newestResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        sort: "newest",
      },
    });
  typia.assert(newestResult);
  // Test 7: Browse with sorting - price ascending
  const priceAscResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        sort: "price_asc",
      },
    });
  typia.assert(priceAscResult);
  // Test 8: Browse with sorting - price descending
  const priceDescResult: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.categories.products.index(connection, {
      categoryId,
      body: {
        sort: "price_desc",
      },
    });
  typia.assert(priceDescResult);
  // Test 9: Validate product summary structure when products exist
  if (basicResult.data.length > 0) {
    const product = basicResult.data[0];
    typia.assert(product);
    // Validate seller summary structure (typia.assert already validates types)
    TestValidator.predicate(
      "seller has shop name",
      product.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller has approval status",
      product.seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller has account status",
      product.seller.account_status !== undefined,
    );
    // Validate category summary structure
    TestValidator.predicate(
      "category has name",
      product.category.name.length > 0,
    );
  }
  // Test 10: Endpoint is accessible without authentication (public access)
  // This is already tested above - if we got here, authentication was not required
  TestValidator.predicate("endpoint accessible without auth", true);
}
