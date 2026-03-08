import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_summary_search_sku_product(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Authenticate seller using utility function
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  // Test 1: Search with SKU code substring (partial match)
  const skuSearchResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "SKU",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuSearchResult);
  // Verify pagination structure
  TestValidator.predicate(
    "pagination has current page",
    skuSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    skuSearchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    skuSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    skuSearchResult.pagination.pages >= 0,
  );
  // Test 2: Search with product name substring
  const productNameSearchResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "Product",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(productNameSearchResult);
  // Test 3: Case-insensitive search
  const lowerCaseSearchResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "sku",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(lowerCaseSearchResult);
  const upperCaseSearchResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "SKU",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(upperCaseSearchResult);
  // Verify case-insensitive search returns same number of records
  TestValidator.equals(
    "case-insensitive search returns same records count",
    lowerCaseSearchResult.pagination.records,
    upperCaseSearchResult.pagination.records,
  );
  // Test 4: Non-matching search term (expect empty results)
  const nonMatchingSearchResult =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "XYZ123NONEXISTENT999",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(nonMatchingSearchResult);
  TestValidator.equals(
    "non-matching search returns empty data",
    nonMatchingSearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search returns zero records",
    nonMatchingSearchResult.pagination.records,
    0,
  );
  // Test 5: Search combined with stock status filter
  const searchWithStockStatus =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "test",
          stockStatus: "in_stock",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(searchWithStockStatus);
  // Test 6: Search combined with sorting
  const searchWithSort =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "test",
          sort: "created_at_desc",
          limit: 10,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(searchWithSort);
  // Test 7: Search combined with pagination
  const searchWithPagination =
    await api.functional.shoppingMall.seller.inventory.summary.index(
      sellerConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "page 1 has correct current page",
    searchWithPagination.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 1 respects limit",
    searchWithPagination.data.length <= 5,
  );
}
