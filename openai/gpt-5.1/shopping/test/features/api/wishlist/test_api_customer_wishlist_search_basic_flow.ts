import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

/**
 * Validate basic wishlist search flow for an authenticated customer.
 *
 * Business goals:
 *
 * - Ensure a newly joined customer can create multiple wishlists.
 * - Verify that PATCH /shoppingMall/customer/wishlists returns only wishlists
 *   belonging to the authenticated customer.
 * - Confirm pagination metadata and wishlist summary fields are consistent with
 *   created data when simple page/limit parameters are provided.
 *
 * Steps:
 *
 * 1. Join as a new customer (POST /auth/customer/join) and obtain an authenticated
 *    context.
 * 2. Create two wishlists for that customer ("Holiday Gifts" and "Work
 *    Equipment").
 * 3. Search wishlists with page=1 and limit=10 (PATCH
 *    /shoppingMall/customer/wishlists).
 * 4. Validate pagination metadata: current (0-based), limit, and records >= 2.
 * 5. Confirm that data contains both created wishlists with correct name,
 *    customer.id, and itemCount = 0.
 * 6. Ensure no wishlist in the page belongs to another customer.
 */
export async function test_api_customer_wishlist_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Customer joins and becomes authenticated
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    { body: joinBody },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  const customerId = authorizedCustomer.id;

  // 2. Create two wishlists for this customer
  const firstWishlistName = "Holiday Gifts";
  const secondWishlistName = "Work Equipment";

  const firstWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: firstWishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert<IShoppingMallWishlist>(firstWishlist);

  const secondWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: secondWishlistName,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert<IShoppingMallWishlist>(secondWishlist);

  // Ensure created wishlists are owned by the authenticated customer
  TestValidator.equals(
    "first wishlist belongs to authorized customer",
    firstWishlist.customer.id,
    customerId,
  );
  TestValidator.equals(
    "second wishlist belongs to authorized customer",
    secondWishlist.customer.id,
    customerId,
  );

  // 3. Search wishlists with simple pagination (page=1, limit=10)
  const searchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallWishlist.IRequest;

  const pageResult = await api.functional.shoppingMall.customer.wishlists.index(
    connection,
    {
      body: searchBody,
    },
  );
  typia.assert<IPageIShoppingMallWishlist.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 4. Pagination metadata validation
  TestValidator.equals(
    "pagination current is 0 (zero-based for first page)",
    pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit matches request limit",
    pagination.limit,
    searchBody.limit,
  );
  TestValidator.predicate(
    "pagination records is at least number of created wishlists (2)",
    pagination.records >= 2,
  );

  // 5. Data content validation
  TestValidator.predicate("data length is at least 2", data.length >= 2);
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    data.length <= pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is >= data length",
    pagination.records >= data.length,
  );

  const foundFirst = data.find((summary) => summary.id === firstWishlist.id);
  const foundSecond = data.find((summary) => summary.id === secondWishlist.id);

  TestValidator.predicate(
    "search result contains first wishlist",
    foundFirst !== undefined,
  );
  TestValidator.predicate(
    "search result contains second wishlist",
    foundSecond !== undefined,
  );

  if (foundFirst !== undefined) {
    TestValidator.equals(
      "first wishlist summary name matches",
      foundFirst.name,
      firstWishlistName,
    );
    TestValidator.equals(
      "first wishlist summary customer id matches",
      foundFirst.customer.id,
      customerId,
    );
    TestValidator.equals(
      "first wishlist itemCount is zero",
      foundFirst.itemCount,
      0,
    );
  }

  if (foundSecond !== undefined) {
    TestValidator.equals(
      "second wishlist summary name matches",
      foundSecond.name,
      secondWishlistName,
    );
    TestValidator.equals(
      "second wishlist summary customer id matches",
      foundSecond.customer.id,
      customerId,
    );
    TestValidator.equals(
      "second wishlist itemCount is zero",
      foundSecond.itemCount,
      0,
    );
  }

  // 6. Ensure all wishlists in this page belong to the authenticated customer
  for (const summary of data) {
    TestValidator.equals(
      "each wishlist summary belongs to authorized customer",
      summary.customer.id,
      customerId,
    );
  }
}
