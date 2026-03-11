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
import { generate_random_ecommerce_mall_customer_wishlist_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlist_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_customer_wishlist_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration using utility function
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create customer-specific connection for authenticated requests
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuth.token.access;
  // 3. Add 3 products to customer's wishlist
  const wishlist1 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlist1);
  const wishlist2 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlist2);
  const wishlist3 =
    await generate_random_ecommerce_mall_customer_wishlist_create(
      customerConnection,
      {},
    );
  typia.assert(wishlist3);
  // 4. Test filter: stockStatus='all', sort='created_at', sortDirection='desc'
  const allWishlist =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "all",
          sort: "created_at",
          sortDirection: "desc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(allWishlist);
  // Validate response structure and pagination metadata
  TestValidator.equals("wishlist count all", allWishlist.data.length, 3);
  TestValidator.equals("pagination current", allWishlist.pagination.current, 1);
  TestValidator.equals("pagination limit", allWishlist.pagination.limit, 10);
  TestValidator.equals("pagination records", allWishlist.pagination.records, 3);
  TestValidator.equals("pagination pages", allWishlist.pagination.pages, 1);
  // Validate data structure - each item must have required fields
  for (const item of allWishlist.data) {
    typia.assert(item);
    TestValidator.predicate("wishlist item has id", item.id !== undefined);
    TestValidator.predicate(
      "wishlist item has createdAt",
      item.createdAt !== undefined,
    );
    TestValidator.predicate(
      "wishlist item has product",
      item.product !== undefined,
    );
    TestValidator.predicate(
      "wishlist item has updatedAt",
      item.updatedAt !== undefined,
    );
    TestValidator.predicate("product has id", item.product.id !== undefined);
    TestValidator.predicate(
      "product has name",
      item.product.name !== undefined,
    );
    TestValidator.predicate(
      "product has basePrice",
      item.product.basePrice !== undefined,
    );
    TestValidator.predicate(
      "product has stockStatus",
      item.product.stockStatus !== undefined,
    );
    // Validate stockStatus is one of the expected values
    TestValidator.predicate(
      "product stockStatus is valid",
      item.product.stockStatus === "in-stock" ||
        item.product.stockStatus === "out-of-stock",
    );
  }
  // 5. Test filter: stockStatus='in-stock', sort='price', sortDirection='asc'
  const inStockWishlist =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "in-stock",
          sort: "price",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(inStockWishlist);
  // Validate in-stock filtering
  TestValidator.predicate(
    "in-stock filter returns valid status",
    inStockWishlist.data.every(
      (item) => item.product.stockStatus === "in-stock",
    ),
  );
  // 6. Test filter: stockStatus='out-of-stock', sort='product_name', sortDirection='asc'
  const outStockWishlist =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "out-of-stock",
          sort: "product_name",
          sortDirection: "asc",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(outStockWishlist);
  // Validate out-of-stock filtering
  TestValidator.predicate(
    "out-of-stock filter returns valid status",
    outStockWishlist.data.every(
      (item) => item.product.stockStatus === "out-of-stock",
    ),
  );
  // 7. Test empty results by querying with filter that excludes all items
  const noResultsWishlist =
    await api.functional.ecommerceMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          stockStatus: "in-stock",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(noResultsWishlist);
  TestValidator.equals(
    "no results data length",
    noResultsWishlist.data.length,
    0,
  );
  TestValidator.equals(
    "no results records",
    noResultsWishlist.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results pages",
    noResultsWishlist.pagination.pages,
    0,
  );
  // 8. Validate pagination metadata calculation for empty results
  TestValidator.predicate(
    "empty pagination pages calculated correctly",
    noResultsWishlist.pagination.pages === 0,
  );
  TestValidator.predicate(
    "empty pagination records matches 0",
    noResultsWishlist.pagination.records === 0,
  );
}
