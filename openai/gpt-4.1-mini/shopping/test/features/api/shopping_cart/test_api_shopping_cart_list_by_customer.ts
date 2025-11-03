import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_shopping_cart_list_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer signs up and obtains authentication token
  const email = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Query shopping carts without filter - expect pagination and data
  const unfilteredResult: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShoppingCart.IRequest,
    });
  typia.assert(unfilteredResult);

  // Check pagination info is reasonable
  TestValidator.predicate(
    "pagination.current is 1",
    unfilteredResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination.limit is 10",
    unfilteredResult.pagination.limit === 10,
  );

  // 3. Query shopping carts filtered by this customer's id - expect data only related to customer
  const filteredByCustomerId: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallShoppingCart.IRequest,
    });
  typia.assert(filteredByCustomerId);

  // Check all returned carts belong to the customer
  for (const cart of filteredByCustomerId.data) {
    TestValidator.equals(
      "cart.shopping_mall_customer_id equals customer.id",
      cart.shopping_mall_customer_id,
      customer.id,
    );
  }

  // 4. Query shopping carts with a date range filter (created_at_from) - expects results created after date
  if (filteredByCustomerId.data.length > 0) {
    const firstCartCreatedAt = filteredByCustomerId.data[0].created_at;
    const createdAtFilter = new Date(
      new Date(firstCartCreatedAt).getTime() - 1000 * 60 * 60 * 24,
    ).toISOString();

    const filteredByCreatedAt: IPageIShoppingMallShoppingCart.ISummary =
      await api.functional.shoppingMall.customer.shoppingCarts.index(
        connection,
        {
          body: {
            shopping_mall_customer_id: customer.id,
            created_at_from: createdAtFilter,
            page: 1,
            limit: 5,
          } satisfies IShoppingMallShoppingCart.IRequest,
        },
      );
    typia.assert(filteredByCreatedAt);

    // Check returned carts are created at or after filter date
    for (const cart of filteredByCreatedAt.data) {
      TestValidator.predicate(
        "cart created_at >= created_at_from",
        cart.created_at >= createdAtFilter,
      );
    }
  }

  // 5. Check pagination providing a page beyond data count returns empty array or proper page
  const highPageNumber = 1000;
  const emptyPageResult: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        page: highPageNumber,
        limit: 10,
      } satisfies IShoppingMallShoppingCart.IRequest,
    });
  typia.assert(emptyPageResult);

  TestValidator.predicate(
    "empty page data is array",
    Array.isArray(emptyPageResult.data),
  );
}
