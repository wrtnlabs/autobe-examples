import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";

export async function test_api_shipping_info_retrieval_nonexistent_order(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish proper authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate a random, non-existent order number that does not correspond to any valid order
  const nonExistentOrderNumber = "ORD-" + RandomGenerator.alphaNumeric(8);

  // Step 3: Attempt to retrieve shipping information for the non-existent order number
  // Step 4: Validate that the system returns a 404 error (HttpError) with appropriate status code
  await TestValidator.httpError(
    "should return 404 for non-existent order number",
    404,
    async () => {
      await api.functional.shoppingMall.orders.shipping.at(connection, {
        orderNumber: nonExistentOrderNumber,
      });
    },
  );
}
