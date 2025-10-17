import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_index(
  connection: api.IConnection,
) {
  // 1. Customer registration via join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd1",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. There is no provided API for creating wishlists,
  // so we test retrieval based on existing or empty wishlists for this customer.

  // 3. Retrieve wishlist list with pagination using the authenticated customer's id

  // Prepare pagination parameters
  const page = 1 satisfies number & tags.Type<"int32">;
  const limit = 10 satisfies number & tags.Type<"int32">;

  const wishlistRequest = {
    shopping_mall_customer_id: authorizedCustomer.id,
    page: page,
    limit: limit,
  } satisfies IShoppingMallWishlist.IRequest;

  const pageResult: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: wishlistRequest,
    });
  typia.assert(pageResult);

  // 4. Validate that the returned wishlists all belong to the customer
  TestValidator.predicate(
    "all wishlists belong to the authenticated customer",
    pageResult.data.every(
      (wishlist) =>
        wishlist.shopping_mall_customer_id === authorizedCustomer.id,
    ),
  );

  // 5. Validate pagination properties
  TestValidator.equals(
    "pagination current page",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals("pagination limit", pageResult.pagination.limit, limit);

  // 6. Validate data length respects pagination limit
  TestValidator.predicate(
    "data length should be less or equal to limit",
    pageResult.data.length <= limit,
  );

  // No unauthorized wishlists should be returned (validated by shopping_mall_customer_id)
}
