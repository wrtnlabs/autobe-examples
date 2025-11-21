import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";

export async function test_api_loyalty_point_transaction_not_found_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin by creating a new admin account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Attempt to retrieve a non-existent loyalty point transaction with a valid UUID format
  const nonExistentId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return 404 for non-existent loyalty point transaction",
    async () => {
      await api.functional.shoppingMall.admin.promotions.loyalty_points.at(
        connection,
        {
          loyaltyPointId: nonExistentId,
        },
      );
    },
  );
}
