import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * Admin shopping carts search validation.
 *
 * 1. Admin registers and authenticates.
 * 2. Searches shopping carts with defined search parameters.
 * 3. Validates response pagination metadata correctness.
 * 4. Validates each returned shopping cart's summary data and consistency.
 * 5. Asserts type safety for all API call results.
 */
export async function test_api_admin_shopping_carts_search(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "securePassword123",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin performs shopping carts search with specific parameters
  const requestBody = {
    page: 1,
    limit: 10,
    search: undefined,
    status: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallShoppingCart.IRequest;

  const result: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.admin.shoppingCarts.index(connection, {
      body: requestBody,
    });
  typia.assert(result);

  const pagination: IPage.IPagination = result.pagination;
  const data: IShoppingMallShoppingCart.ISummary[] = result.data;

  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pagination.current,
    requestBody.page,
  );
  TestValidator.equals("pagination limit", pagination.limit, requestBody.limit);
  TestValidator.predicate(
    "pagination records count non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count matches",
    pagination.pages >= 0 && pagination.pages >= pagination.current,
  );

  // 4. Validate the shopping carts summaries
  for (const cart of data) {
    typia.assert(cart);
    // Check required properties existence and valid UUIDs for id
    TestValidator.predicate(
      "shopping cart id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        cart.id,
      ),
    );

    // Customer summary must be present and valid
    typia.assert(cart.customer);
    TestValidator.predicate(
      "customer id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        cart.customer.id,
      ),
    );

    // Items count should be a non-negative integer
    TestValidator.predicate(
      "items_count is non-negative integer",
      Number.isInteger(cart.items_count) && cart.items_count >= 0,
    );
  }

  // 5. At least validate that returned cart count does not exceed requested limit
  TestValidator.predicate(
    "result data length does not exceed limit",
    data.length <= requestBody.limit,
  );
}
