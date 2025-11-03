import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_shopping_cart_index_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration (join) to authenticate as a customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(customerAuthorized);

  // 2. Prepare filter criteria for shopping carts
  // Using authenticated customer's id, session id, randomly generated date ranges
  const filterCriteria = {
    shopping_mall_customer_id: customerAuthorized.id,
    shopping_mall_customer_session_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    created_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(), // 7 days ago
    created_at_to: new Date(Date.now()).toISOString(), // now
    updated_at_from: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 3,
    ).toISOString(), // 3 days ago
    updated_at_to: new Date(Date.now()).toISOString(), // now
    page: 1,
    limit: 5,
  } satisfies IShoppingMallShoppingCart.IRequest;

  // 3. Invoke shopping cart index API with filter/pagination
  const response: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: filterCriteria,
    });

  typia.assert(response);
  // 4. Assertions to validate response structure
  TestValidator.predicate(
    "pagination present",
    typeof response.pagination === "object" && response.pagination !== null,
  );

  TestValidator.predicate(
    "page number correct",
    response.pagination.current === filterCriteria.page,
  );

  TestValidator.predicate(
    "page limit correct",
    response.pagination.limit === filterCriteria.limit,
  );

  TestValidator.predicate("data is array", Array.isArray(response.data));

  // All carts must belong to the authenticated customer
  for (const cart of response.data) {
    typia.assert(cart);
    TestValidator.equals(
      "cart belongs to customer",
      cart.shopping_mall_customer_id,
      customerAuthorized.id,
    );
  }
}
