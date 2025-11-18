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
 * Validate that updating a seller subscription cannot produce inconsistent
 * seller relations.
 *
 * Business intent: This test exercises the admin-only seller subscription
 * update endpoint to ensure that attempts to change the seller binding of an
 * existing subscription (`seller_id`) either:
 *
 * - Are safely applied with all related summary fields updated, or
 * - Are effectively rejected/ignored so that the original seller relation remains
 *   intact.
 *
 * The critical guarantee is that the scalar foreign key `seller_id` and the
 * associated `seller` summary object (when present) never diverge. The test
 * also verifies that the plan relation remains stable and consistent across the
 * update.
 *
 * Steps:
 *
 * 1. Join as an admin to obtain an authorized admin context.
 * 2. Create a seller subscription plan to have a valid plan id.
 * 3. Create a seller subscription bound to some seller and that plan.
 * 4. Attempt to update the subscription's `seller_id` to a new UUID.
 * 5. Assert that the post-update subscription remains consistent:
 *
 *    - If `seller_id` changed, `seller?.id` must match the new `seller_id`.
 *    - If `seller_id` did not change, both `seller_id` and `seller?.id` must still
 *         match the original values.
 *    - In all cases, plan id and plan summary remain aligned.
 */
export async function test_api_seller_subscription_update_immutable_relations_enforcement(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a seller subscription plan to be referenced by subscriptions
  const now = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(now.getTime() + oneMonthMs).toISOString();

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: RandomGenerator.pick(["monthly", "yearly"] as const),
    currency: "USD",
    price_amount: 49.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create a baseline seller subscription
  const originalSellerId = typia.random<string & tags.Format<"uuid">>();
  const subscriptionCreateBody = {
    seller_id: originalSellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: now.toISOString(),
    ended_at: null,
    next_billing_at: new Date(now.getTime() + oneMonthMs).toISOString(),
    currency: plan.currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const createdSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(createdSubscription);

  const originalSubscriptionId = createdSubscription.id;
  const originalPlanId = createdSubscription.seller_subscription_plan_id;
  const originalSellerSummary = createdSubscription.seller;
  const originalPlanSummary = createdSubscription.plan;

  if (originalSellerSummary !== undefined) {
    TestValidator.equals(
      "initial seller summary id matches seller_id",
      originalSellerSummary.id,
      createdSubscription.seller_id,
    );
  }
  if (originalPlanSummary !== undefined) {
    TestValidator.equals(
      "initial plan summary id matches plan id",
      originalPlanSummary.id,
      createdSubscription.seller_subscription_plan_id,
    );
  }

  // 4. Attempt to change seller_id to a different seller
  const newSellerId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    seller_id: newSellerId,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updatedSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: originalSubscriptionId,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updatedSubscription);

  // 5. Consistency checks around seller relation
  const finalSellerId = updatedSubscription.seller_id;
  const finalSellerSummary = updatedSubscription.seller;

  // Regardless of whether seller_id was changed or kept, seller summary (if
  // present) must match the scalar foreign key.
  if (finalSellerSummary !== undefined) {
    TestValidator.equals(
      "updated seller summary id matches scalar seller_id",
      finalSellerSummary.id,
      finalSellerId,
    );
  }

  // Determine behavior: immutable vs reassigned. The test does not fail based
  // on which behavior is chosen, only on inconsistency.
  const sellerIdChanged = finalSellerId !== originalSellerId;

  if (sellerIdChanged) {
    // When reassigned, ensure it matches the requested newSellerId.
    TestValidator.equals(
      "seller_id should equal requested newSellerId when reassignment is allowed",
      finalSellerId,
      newSellerId,
    );
  } else {
    // When immutable, ensure still equal to original seller id.
    TestValidator.equals(
      "seller_id remains original when immutable",
      finalSellerId,
      originalSellerId,
    );
  }

  // 6. Plan integrity checks – plan id and plan summary should remain consistent
  TestValidator.equals(
    "plan id should remain unchanged after seller update attempt",
    updatedSubscription.seller_subscription_plan_id,
    originalPlanId,
  );

  const finalPlanSummary = updatedSubscription.plan;
  if (finalPlanSummary !== undefined) {
    TestValidator.equals(
      "updated plan summary id matches scalar plan id",
      finalPlanSummary.id,
      updatedSubscription.seller_subscription_plan_id,
    );
  }

  // Basic sanity check on core timestamps via runtime type assertions.
  typia.assert<string & tags.Format<"date-time">>(
    updatedSubscription.started_at,
  );
  if (
    updatedSubscription.ended_at !== null &&
    updatedSubscription.ended_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(
      updatedSubscription.ended_at,
    );
  }
  if (
    updatedSubscription.next_billing_at !== null &&
    updatedSubscription.next_billing_at !== undefined
  ) {
    typia.assert<string & tags.Format<"date-time">>(
      updatedSubscription.next_billing_at,
    );
  }

  TestValidator.predicate(
    "discount_amount should not be negative",
    updatedSubscription.discount_amount >= 0,
  );
}
