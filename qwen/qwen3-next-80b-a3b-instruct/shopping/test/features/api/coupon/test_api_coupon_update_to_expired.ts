import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";

export async function test_api_coupon_update_to_expired(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "adminPassword123";
  const adminFirstName = RandomGenerator.name();
  const adminLastName = RandomGenerator.name();
  const adminRole: IShoppingMallAdmin.ICreate["role"] = "full_admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a coupon to update
  const couponCode = RandomGenerator.alphaNumeric(10);
  const couponAmount = 25;
  const validUntil = new Date(Date.now() + 86400000).toISOString(); // 24 hours in future

  const createdCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.create(
      connection,
      {
        body: `${couponCode}:${couponAmount}:${validUntil}` satisfies IShoppingMallCoupon.ICreate,
      },
    );
  typia.assert(createdCoupon);

  // Step 3: Update coupon to expire by setting valid_until to a past date
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour in past
  const updateBody =
    `${couponCode}:${couponAmount}:${pastDate}` satisfies IShoppingMallCoupon.IUpdate;

  const updatedCoupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.admin.promotions.coupons.update(
      connection,
      {
        couponCode,
        body: updateBody,
      },
    );
  typia.assert(updatedCoupon);

  // Step 4: Verify the update succeeded (no other validation possible with available APIs)
  // The scenario requests verifying coupon status changes to 'expired' and redemption attempts
  // are rejected, but there is no GET endpoint to verify status and no redemption endpoint
  // to test rejection. We can only verify the update call itself succeeded.
  // System automatically changes status to expired upon setting valid_until to past date.
}
