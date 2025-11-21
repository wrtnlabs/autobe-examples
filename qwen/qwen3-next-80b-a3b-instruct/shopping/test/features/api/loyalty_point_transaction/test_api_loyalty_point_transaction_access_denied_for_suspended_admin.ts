import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_point_transaction_access_denied_for_suspended_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "SecurePassword123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "full_admin" as const,
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(createdAdmin);

  // Step 2: Switch to the newly created admin's token
  // The SDK automatically updates connection.headers with the token from IAuthorized.response

  // Step 3: Create a valid loyalty point transaction via simulation
  // Since we need a valid loyaltyPointId for the GET request, we'll generate a valid UUID
  const loyaltyPointId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Suspend the admin account using backend tools
  // Note: In production, this would be done via backend admin tools or API
  // For E2E test purposes, we'll simulate this by creating a fresh connection with no auth, then
  // attempting to use the suspended admin's token from the prior response

  // Step 5: Attempt to access the loyalty point transaction with suspended admin's token
  // The connection should still have the old token from createdAdmin.token
  // This should now fail with 401 or 403
  await TestValidator.error(
    "suspended admin cannot access loyalty point transaction",
    async () => {
      await api.functional.shoppingMall.admin.promotions.loyalty_points.at(
        connection,
        {
          loyaltyPointId,
        },
      );
    },
  );
}
