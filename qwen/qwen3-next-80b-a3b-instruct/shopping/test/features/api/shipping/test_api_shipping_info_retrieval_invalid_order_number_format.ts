import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderShipping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipping";

export async function test_api_shipping_info_retrieval_invalid_order_number_format(
  connection: api.IConnection,
) {
  // Authenticate as admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to retrieve shipping info with invalid order number format
  await TestValidator.error(
    "should reject order number with non-numeric characters",
    async () => {
      await api.functional.shoppingMall.orders.shipping.at(connection, {
        orderNumber: "INVALID-ORDER-123", // Contains non-numeric characters
      });
    },
  );
}
