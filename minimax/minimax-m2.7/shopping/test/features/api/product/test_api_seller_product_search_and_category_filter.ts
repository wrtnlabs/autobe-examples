import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_search_and_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const seller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create seller-specific connection with authorization
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 3. Search products - test partial name matching with "test"
  const searchByNameResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        search: "test",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(searchByNameResponse);
  // 4. Validate search response structure
  TestValidator.equals(
    "has pagination",
    searchByNameResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(searchByNameResponse.data),
    true,
  );
  // 5. Test category filter
  const categoryFilterResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(categoryFilterResponse);
  // 6. Test sorting options - newest
  const sortNewestResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortNewestResponse);
  // 7. Test sorting options - price_asc
  const sortPriceAscResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        sort: "price_asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortPriceAscResponse);
  // 8. Test sorting options - price_desc
  const sortPriceDescResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        sort: "price_desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(sortPriceDescResponse);
  // 9. Test in-stock filter
  const inStockResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        inStock: true,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(inStockResponse);
  // 10. Test price range filter
  const priceRangeResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        minPrice: 0,
        maxPrice: 1000000,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(priceRangeResponse);
  // 11. Test combined filters (search + sort)
  const combinedFiltersResponse =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        search: "product",
        sort: "newest",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(combinedFiltersResponse);
  // 12. Test pagination limits
  const paginationTest =
    await api.functional.ecommerceMall.seller.products.index(sellerConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallProduct.IRequest,
    });
  typia.assert(paginationTest);
  TestValidator.equals("limit respected", paginationTest.pagination.limit, 10);
}
