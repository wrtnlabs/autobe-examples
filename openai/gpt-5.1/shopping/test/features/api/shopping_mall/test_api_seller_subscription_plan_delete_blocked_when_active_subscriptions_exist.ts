import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Ensure that deleting a seller subscription plan is blocked when active
 * subscriptions reference it.
 *
 * Business flow:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context (SDK attaches token to connection automatically).
 * 2. As the admin, create a seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans and capture its `code` and
 *    `id`.
 * 3. Still as the admin, create a seller subscription via POST
 *    /shoppingMall/admin/sellerSubscriptions that references the created plan
 *    by `seller_subscription_plan_id`.
 * 4. Attempt to delete the plan via DELETE
 *    /shoppingMall/admin/sellerSubscriptionPlans/{planCode}.
 * 5. Verify that the deletion attempt fails (some error is thrown) because the
 *    plan is in active use by at least one subscription.
 *
 * Due to available SDK constraints, we cannot re-fetch the plan or
 * subscriptions for post-condition verification, nor can we assert specific
 * HTTP status codes. The test therefore focuses on type safety for creation
 * calls and on the presence of an error when attempting the deletion, using
 * TestValidator.error without inspecting error details.
 */
export async function test_api_seller_subscription_plan_delete_blocked_when_active_subscriptions_exist(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and becomes authenticated.
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan with a deterministic business code.
  const randomPlanInput =
    typia.random<IShoppingMallSellerSubscriptionPlan.ICreate>();
  const planCode = `plan_${RandomGenerator.alphaNumeric(8)}`;
  const planCreateBody = {
    ...randomPlanInput,
    code: planCode,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert(plan);

  TestValidator.equals(
    "created plan code should match requested code",
    plan.code,
    planCode,
  );

  // 3. Create a seller subscription referencing the created plan.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: new Date().toISOString(),
    ended_at: null,
    next_billing_at: null,
    currency: plan.currency as string & tags.MinLength<1>,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription should reference created plan by id",
    subscription.seller_subscription_plan_id,
    plan.id,
  );

  TestValidator.equals(
    "subscription currency should match plan currency",
    subscription.currency,
    plan.currency,
  );

  // 4. Attempt to delete the plan; expect an error because it is in use.
  await TestValidator.error(
    "deleting plan with active subscriptions should fail",
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
