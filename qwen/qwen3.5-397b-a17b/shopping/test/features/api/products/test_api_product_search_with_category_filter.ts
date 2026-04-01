import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_search_with_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Search products with category filter
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const searchResult =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          category_id: categoryId,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(searchResult);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "current page is valid",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit is valid", searchResult.pagination.limit > 0);
  TestValidator.predicate(
    "records count is valid",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("has data array", Array.isArray(searchResult.data));
  // 5. Validate product summaries structure (if any products exist)
  if (searchResult.data.length > 0) {
    const product = searchResult.data[0];
    TestValidator.predicate(
      "product is defined",
      product !== undefined,
    );
  }
  // 6. Test search with combined filters (category + price range)
  const minPrice = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10000>
  >() satisfies number as number;
  const maxPrice = (minPrice +
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
    >()) satisfies number as number;
  const filteredResult =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          category_id: categoryId,
          min_price: minPrice,
          max_price: maxPrice,
          in_stock: true,
          limit: 10,
          sort: "priceAsc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered result limit",
    filteredResult.pagination.limit,
    10,
  );
  // 7. Test search with different sorting option
  const sortedResult =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          category_id: categoryId,
          limit: 15,
          sort: "priceDesc",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result has data",
    Array.isArray(sortedResult.data),
  );
  // 8. Test search with text search and category filter combined
  const searchQuery = RandomGenerator.alphabets(5);
  const textSearchResult =
    await api.functional.shoppingMall.customer.products.search(
      customerConnection,
      {
        body: {
          search: searchQuery,
          category_id: categoryId,
          limit: 20,
          sort: "newest",
        } satisfies IShoppingMallProduct.IRequest,
      },
    );
  typia.assert(textSearchResult);
  TestValidator.predicate(
    "text search result has valid pagination",
    textSearchResult.pagination.current >= 1,
  );
}