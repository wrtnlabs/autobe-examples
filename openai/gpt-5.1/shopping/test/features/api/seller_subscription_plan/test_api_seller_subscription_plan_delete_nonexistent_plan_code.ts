import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate behavior of deleting a non-existent seller subscription plan by
 * planCode.
 *
 * Business goal: Ensure that DELETE
 * /shoppingMall/admin/sellerSubscriptionPlans/{planCode} does not silently
 * succeed as a no-op when the provided planCode does not correspond to any
 * existing plan, and that existing plans remain unaffected.
 *
 * Test workflow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authorized context.
 * 2. Seed at least one real seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans so the system has data that
 *    must not be deleted.
 * 3. Construct a synthetic planCode that is guaranteed not to match any existing
 *    plan (distinct from the created plan code).
 * 4. Call DELETE /shoppingMall/admin/sellerSubscriptionPlans/{planCode} using
 *    api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase with the
 *    nonexistent planCode.
 * 5. Assert that the erase operation throws an error using TestValidator.error,
 *    confirming that the API does not treat deletion of a non-existent plan as
 *    a successful no-op.
 * 6. Because no index/get API for plans is available, rely on the invariant that a
 *    failed erase call implies no mutation of existing plans.
 */
export async function test_api_seller_subscription_plan_delete_nonexistent_plan_code(
  connection: api.IConnection,
) {
  // 1. Register an admin to get an authorized context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Seed at least one real seller subscription plan.
  const existingPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: typia.random<IShoppingMallSellerSubscriptionPlan.ICreate>(),
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(existingPlan);

  // 3. Construct a synthetic non-existent planCode that differs from existingPlan.code.
  const nonexistentPlanCodeBase: string = RandomGenerator.alphaNumeric(16);
  const nonexistentPlanCode: string =
    existingPlan.code === nonexistentPlanCodeBase
      ? `${nonexistentPlanCodeBase}_nonexistent`
      : nonexistentPlanCodeBase;

  // 4-5. Call erase with the non-existent planCode and assert an error is thrown.
  await TestValidator.error(
    "erase must fail for non-existent planCode",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
        connection,
        {
          planCode: nonexistentPlanCode,
        },
      );
    },
  );

  // 6. Implicitly rely on the semantics that a failed erase call does not
  // modify existing plans. No explicit re-fetch API is available, so we focus
  // on the error behavior rather than data re-validation.
}
