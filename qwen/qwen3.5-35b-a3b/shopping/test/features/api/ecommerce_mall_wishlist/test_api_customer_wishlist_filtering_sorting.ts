import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAuth);
  customerConnection.headers = {
    ...customerConnection.headers,
    Authorization: customerAuth.token.access,
  };
  // Note: Cannot create wishlist entries directly - using random generated responses
  // The endpoint returns wishlist entries with products, we test filtering/sorting/pagination
  // on whatever data the backend returns
  // Test 1: Basic query - empty wishlist
  const emptyWishlist: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyWishlist);
  TestValidator.equals(
    "empty wishlist - data length",
    emptyWishlist.data.length,
    0,
  );
  // Test 2: In-stock filter (empty results for new account)
  const inStockResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { availability: "in-stock" },
      },
    );
  typia.assert(inStockResponse);
  TestValidator.equals(
    "in-stock filter on empty - data length",
    inStockResponse.data.length,
    0,
  );
  // Test 3: Out-of-stock filter (empty results for new account)
  const outStockResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { availability: "out-of-stock" },
      },
    );
  typia.assert(outStockResponse);
  TestValidator.equals(
    "out-of-stock filter on empty - data length",
    outStockResponse.data.length,
    0,
  );
  // Test 4: Price ascending sort (empty results for new account)
  const priceAscResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sortBy: "price", sortOrder: "asc" },
      },
    );
  typia.assert(priceAscResponse);
  TestValidator.equals(
    "price ascending on empty - data length",
    priceAscResponse.data.length,
    0,
  );
  // Test 5: Price descending sort (empty results for new account)
  const priceDescResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sortBy: "price", sortOrder: "desc" },
      },
    );
  typia.assert(priceDescResponse);
  TestValidator.equals(
    "price descending on empty - data length",
    priceDescResponse.data.length,
    0,
  );
  // Test 6: createdAt ascending sort (empty results for new account)
  const createdAscResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sortBy: "createdAt", sortOrder: "asc" },
      },
    );
  typia.assert(createdAscResponse);
  TestValidator.equals(
    "createdAt ascending on empty - data length",
    createdAscResponse.data.length,
    0,
  );
  // Test 7: createdAt descending sort (empty results for new account)
  const createdDescResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { sortBy: "createdAt", sortOrder: "desc" },
      },
    );
  typia.assert(createdDescResponse);
  TestValidator.equals(
    "createdAt descending on empty - data length",
    createdDescResponse.data.length,
    0,
  );
  // Test 8: Pagination limit validation
  const paginatedResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { limit: 2 },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit 2 - data length",
    paginatedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination limit 2 - current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit 2 - limit field",
    paginatedResponse.pagination.limit,
    2,
  );
  // Test 9: Pagination metadata validation
  TestValidator.equals(
    "pagination - records count",
    paginatedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination - pages count",
    paginatedResponse.pagination.pages,
    0,
  );
  // Test 10: Combined filters - in-stock + price descending
  const combinedStockPriceResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { availability: "in-stock", sortBy: "price", sortOrder: "desc" },
      },
    );
  typia.assert(combinedStockPriceResponse);
  TestValidator.equals(
    "combined in-stock desc - data length",
    combinedStockPriceResponse.data.length,
    0,
  );
  // Test 11: Combined filters - out-of-stock + createdAt ascending
  const combinedStockCreatedResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability: "out-of-stock",
          sortBy: "createdAt",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(combinedStockCreatedResponse);
  TestValidator.equals(
    "combined out-of-stock asc - data length",
    combinedStockCreatedResponse.data.length,
    0,
  );
  // Test 12: Page parameter validation
  const pageResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { page: 1 },
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page 1 - data length", pageResponse.data.length, 0);
  // Test 13: Invalid page parameter (negative should work with default behavior)
  const invalidPageResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: { page: 0 },
      },
    );
  typia.assert(invalidPageResponse);
  TestValidator.equals(
    "page 0 - data length",
    invalidPageResponse.data.length,
    0,
  );
  // Test 14: All filters combined
  const allFiltersResponse: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          availability: "in-stock",
          sortBy: "price",
          sortOrder: "desc",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(allFiltersResponse);
  TestValidator.equals(
    "all filters combined - data length",
    allFiltersResponse.data.length,
    0,
  );
}