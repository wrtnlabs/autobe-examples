import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Verify that deleting a seller subscription plan is restricted to
 * authenticated admins and that unauthenticated access is rejected.
 *
 * Business context: Seller subscription plans define billing and commercial
 * terms for sellers. Deleting such a plan is a destructive administrative
 * operation and must only be permitted for authenticated admin actors. This
 * test ensures that the DELETE endpoint for seller subscription plans enforces
 * this admin-only access control.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join, which also authenticates the
 *    admin and sets Authorization header on the SDK connection.
 * 2. Create a seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans so that we have a concrete
 *    planCode to delete.
 * 3. Attempt to delete the plan using an unauthenticated connection (no headers)
 *    and assert that an error is thrown.
 * 4. Delete the plan using the authenticated admin connection and assert that it
 *    succeeds without error.
 * 5. Optionally, attempt to delete the same plan again as admin and assert that an
 *    error occurs, confirming the plan is no longer deletable.
 */
export async function test_api_seller_subscription_plan_delete_requires_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Join as an admin (implicit login and token setup by SDK)
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a seller subscription plan as the authenticated admin
  const planCreateBody =
    typia.random<IShoppingMallSellerSubscriptionPlan.ICreate>();

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Attempt to delete the plan with an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated delete must fail", async () => {
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
      unauthenticatedConnection,
      {
        planCode: plan.code,
      },
    );
  });

  // 4. Delete the plan with the authenticated admin connection - should succeed
  await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
    connection,
    {
      planCode: plan.code,
    },
  );

  // 5. Second delete attempt as admin should fail because the plan is gone or
  //    no longer deletable. We don't assert the specific HTTP status code.
  await TestValidator.error(
    "second delete on same plan should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
        connection,
        {
          planCode: plan.code,
        },
      );
    },
  );
}
