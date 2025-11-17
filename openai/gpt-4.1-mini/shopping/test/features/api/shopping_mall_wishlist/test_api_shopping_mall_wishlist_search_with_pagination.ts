import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_shopping_mall_wishlist_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Customer registration via join
  const customerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Prepare search request with pagination and optional filtering
  const searchRequestBody = {
    page: 1,
    limit: 10,
    created_at_from: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days ago
    include_deleted: false,
  } satisfies IShoppingMallWishlist.IRequest;

  // 3. Execute wishlist search
  const wishlistPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.shoppingMallWishlists.index(
      connection,
      { body: searchRequestBody },
    );

  // 4. Validate response
  typia.assert(wishlistPage);

  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page should be at least 1",
    wishlistPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    wishlistPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should not be negative",
    wishlistPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be consistent",
    wishlistPage.pagination.pages >= 0 &&
      wishlistPage.pagination.pages >= wishlistPage.pagination.current,
  );

  // 6. Validate each wishlist entry
  for (const wishlist of wishlistPage.data) {
    typia.assert(wishlist);
    TestValidator.predicate(
      "wishlist shopping_mall_customer_id should be valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        wishlist.shopping_mall_customer_id,
      ),
    );
    TestValidator.predicate(
      "wishlist created_at should be valid ISO date-time",
      !isNaN(Date.parse(wishlist.created_at)),
    );
  }
}
