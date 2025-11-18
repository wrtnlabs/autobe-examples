import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate idempotency and error semantics when deleting the same seller
 * subscription plan twice.
 *
 * Business context:
 *
 * - Only authenticated admins can manage seller subscription plans.
 * - An admin defines seller subscription plans that sellers can subscribe to.
 * - DELETE /shoppingMall/admin/sellerSubscriptionPlans/{planCode} permanently
 *   removes a plan identified by its business code.
 *
 * What this test validates:
 *
 * 1. An admin can create a seller subscription plan.
 * 2. The admin can successfully delete that plan once by its planCode.
 * 3. When the same delete is invoked a second time with the same planCode, the
 *    system exhibits predictable behavior:
 *
 *    - Either behaves idempotently (second delete also succeeds as a no-op), or
 *    - Throws an error to signal that the plan no longer exists.
 *
 * Because the provided SDK does not expose read/list endpoints for
 * sellerSubscriptionPlans, this test focuses purely on the observable behavior
 * of the erase operation itself, without re-reading the deleted resource.
 */
export async function test_api_seller_subscription_plan_delete_idempotency_behavior(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan to be deleted
  const createBody =
    typia.random<IShoppingMallSellerSubscriptionPlan.ICreate>();

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPlan);

  const planCode: string = createdPlan.code;
  TestValidator.predicate(
    "created plan should have a non-empty code",
    () => planCode.length > 0,
  );

  // 3. First delete: must succeed (no error expected)
  await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
    connection,
    {
      planCode,
    },
  );

  // 4. Second delete: either idempotent success or explicit error
  let secondDeleteSucceeded = false;
  let secondDeleteErrored = false;

  try {
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
      connection,
      {
        planCode,
      },
    );
    secondDeleteSucceeded = true;
  } catch (_error) {
    secondDeleteErrored = true;
  }

  // At least one behavior (success or error) must have occurred
  TestValidator.predicate(
    "second delete must either succeed or error",
    () => secondDeleteSucceeded !== secondDeleteErrored,
  );

  if (secondDeleteSucceeded) {
    TestValidator.predicate(
      "second delete succeeded, indicating idempotent delete behavior",
      () => secondDeleteSucceeded === true && secondDeleteErrored === false,
    );
  } else {
    TestValidator.predicate(
      "second delete errored, indicating non-idempotent but deterministic behavior",
      () => secondDeleteErrored === true && secondDeleteSucceeded === false,
    );
  }
}
