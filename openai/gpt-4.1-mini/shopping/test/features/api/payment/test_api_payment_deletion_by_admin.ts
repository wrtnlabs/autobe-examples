import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * This test checks the admin payment deletion endpoint.
 *
 * Step 1: Sign up and authenticate an admin user via /auth/admin/join Step 2:
 * Attempt to delete a payment with a valid UUID ID Step 3: Confirm deletion
 * does not return content (void) Step 4: Attempt to delete a payment with an
 * invalid UUID to verify error handling
 */
export async function test_api_payment_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const adminData = {
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
    password: "1234",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // 2. Delete payment record with a valid UUID
  const paymentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.shoppingMall.admin.payments.erase(connection, {
    id: paymentId,
  });

  // 3. Attempt deletion with invalid UUID to test failure
  const invalidPaymentId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  await TestValidator.error(
    "invalid payment id deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.erase(connection, {
        id: invalidPaymentId,
      });
    },
  );
}
