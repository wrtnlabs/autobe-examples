import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_shopping_mall_customer_shopping_mall_cart_list(
  connection: api.IConnection,
) {
  // 1. Register a new customer to authenticate
  const email = `${RandomGenerator.alphaNumeric(8).toLowerCase()}@test.com`;
  const password = RandomGenerator.alphaNumeric(12);

  const newCustomer = {
    email,
    password,
    href: "https://example.com/signup",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.ICreate;

  const authorizedCustomer = await api.functional.auth.customer.join(
    connection,
    {
      body: newCustomer,
    },
  );
  typia.assert(authorizedCustomer);

  // 2. Test empty filter - expect initial page response
  const emptyRequest = {} satisfies IShoppingMallCart.IRequest;
  const emptyResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: emptyRequest },
    );
  typia.assert(emptyResult);
  TestValidator.predicate(
    "empty result has pagination and data arrays",
    emptyResult.pagination !== undefined && Array.isArray(emptyResult.data),
  );

  // 3. Filter by created_at_from (30 days ago)
  const createdAtFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdFromRequest = {
    created_at_from: createdAtFrom,
  } satisfies IShoppingMallCart.IRequest;
  const createdFromResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: createdFromRequest },
    );
  typia.assert(createdFromResult);

  // 4. Filter by created_at_to (1 day future)
  const createdAtTo = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdToRequest = {
    created_at_to: createdAtTo,
  } satisfies IShoppingMallCart.IRequest;
  const createdToResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: createdToRequest },
    );
  typia.assert(createdToResult);

  // 5. Filter by updated_at_from and updated_at_to
  const updatedFromToRequest = {
    updated_at_from: createdAtFrom,
    updated_at_to: createdAtTo,
  } satisfies IShoppingMallCart.IRequest;
  const updatedFromToResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: updatedFromToRequest },
    );
  typia.assert(updatedFromToResult);

  // 6. Filter by deleted_at null
  const deletedAtNullRequest = {
    deleted_at: null,
  } satisfies IShoppingMallCart.IRequest;
  const deletedAtNullResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: deletedAtNullRequest },
    );
  typia.assert(deletedAtNullResult);

  // 7. Pagination test (page 2, limit 10)
  const paginationRequest = {
    page: 2,
    limit: 10,
  } satisfies IShoppingMallCart.IRequest;
  const paginationResult =
    await api.functional.shoppingMall.customer.shoppingMallCarts.index(
      connection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination has correct current and limit values",
    paginationResult.pagination.current === 2 &&
      paginationResult.pagination.limit === 10,
  );

  // 8. Validate carts data for each result
  const results = [
    emptyResult,
    createdFromResult,
    createdToResult,
    updatedFromToResult,
    deletedAtNullResult,
    paginationResult,
  ];

  for (const result of results) {
    for (const cart of result.data) {
      typia.assert(cart);

      TestValidator.predicate(
        `cart.id is valid UUID: ${cart.id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          cart.id,
        ),
      );

      TestValidator.predicate(
        `cart.shopping_mall_customer_id is valid UUID: ${cart.shopping_mall_customer_id}`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          cart.shopping_mall_customer_id,
        ),
      );

      if (
        cart.shopping_mall_customer_session_id !== null &&
        cart.shopping_mall_customer_session_id !== undefined
      ) {
        typia.assert<string & tags.Format<"uuid">>(
          cart.shopping_mall_customer_session_id,
        );
      }

      typia.assert<string & tags.Format<"date-time">>(cart.created_at);
      typia.assert<string & tags.Format<"date-time">>(cart.updated_at);

      if (cart.deleted_at !== null && cart.deleted_at !== undefined) {
        typia.assert<string & tags.Format<"date-time">>(cart.deleted_at);
      }
    }
  }
}
