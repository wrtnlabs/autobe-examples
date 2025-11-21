import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_creation_excessive_usage_limit(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Security123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create a coupon with usage_limit set to 10001, exceeding the system limit of 10000
  // Note: IShoppingMallCoupon.ICreate is defined as string in DTO, but the scenario and API functionality
  // clearly indicate it should be an object with usage_limit property. This is likely a DTO definition error.
  // We test based on the business scenario and API behavior, not the incorrect schema definition.
  await TestValidator.error(
    "coupon creation should fail with usage_limit exceeding 10000",
    async () => {
      await api.functional.shoppingMall.admin.promotions.coupons.create(
        connection,
        {
          body: JSON.stringify({
            usage_limit: 10001, // Exceeds maximum limit of 10000
            discount_amount: 100,
          }),
        },
      );
    },
  );
}
