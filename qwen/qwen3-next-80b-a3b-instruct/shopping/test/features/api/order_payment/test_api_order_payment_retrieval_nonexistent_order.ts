import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";

export async function test_api_order_payment_retrieval_nonexistent_order(
  connection: api.IConnection,
) {
  // Authenticate as admin to establish valid session for testing access controls
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "supersecurepassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Attempt to retrieve payment details for a non-existent order number
  // This should fail with a 404 error since the order does not exist in the system
  await TestValidator.error(
    "retrieving payment for non-existent order should fail with 404",
    async () => {
      await api.functional.shoppingMall.admin.orders.payment.at(connection, {
        orderNumber: "ORD-99999999-00000", // Non-existent order number format
      });
    },
  );
}
