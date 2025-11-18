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
 * Switch an existing seller subscription from one plan to another.
 *
 * Business flow under admin context:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain authorized admin session.
 * 2. Admin creates two seller subscription plans (Plan A and Plan B).
 * 3. Admin creates a seller subscription referencing Plan A.
 * 4. Admin updates that subscription to reference Plan B, and aligns
 *    price_amount/discount_amount/next_billing_at with Plan B terms.
 * 5. Validate that foreign keys and monetary fields are updated while historical
 *    identity fields remain stable and updated_at changes.
 */
export async function test_api_seller_subscription_update_switch_plan(
  connection: api.IConnection,
) {
  // 1. Admin joins to get authorized context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two seller subscription plans: Plan A and Plan B
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const planACreate = {
    code: `PLAN_A_${RandomGenerator.alphaNumeric(8)}`,
    name: "Plan A - baseline",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: new Date(now.getTime() - oneDayMs).toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const planA: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planACreate },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(planA);

  const planBCreate = {
    code: `PLAN_B_${RandomGenerator.alphaNumeric(8)}`,
    name: "Plan B - upgraded",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "yearly",
    currency: planA.currency,
    price_amount: 1200,
    is_active: true,
    effective_from: new Date(now.getTime() - oneDayMs).toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const planB: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planBCreate },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(planB);

  // 3. Create a seller subscription tied to Plan A.
  // Note: seller_id must be a UUID; in this test we assume a synthetic UUID is acceptable.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const subscriptionCreate = {
    seller_id: sellerId,
    seller_subscription_plan_id: planA.id,
    status: "active",
    started_at: now.toISOString(),
    ended_at: null,
    next_billing_at: new Date(now.getTime() + oneDayMs).toISOString(),
    currency: planA.currency,
    price_amount: planA.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const created: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreate },
    );
  typia.assert<IShoppingMallSellerSubscription>(created);

  // Snapshot key historical fields before update
  const originalId = created.id;
  const originalSellerId = created.seller_id;
  const originalStartedAt = created.started_at;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  TestValidator.equals(
    "initial subscription linked to Plan A",
    created.seller_subscription_plan_id,
    planA.id,
  );
  TestValidator.equals(
    "initial subscription currency matches plan A",
    created.currency,
    planA.currency,
  );
  TestValidator.equals(
    "initial subscription price matches plan A",
    created.price_amount,
    planA.price_amount,
  );

  // 4. Prepare update body to switch to Plan B
  const nextBillingForPlanB = new Date(
    now.getTime() + 30 * oneDayMs,
  ).toISOString();

  const updateBody = {
    seller_subscription_plan_id: planB.id,
    price_amount: planB.price_amount,
    discount_amount: 0,
    next_billing_at: nextBillingForPlanB,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updated: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: created.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updated);

  // 5. Validate identity fields remain unchanged
  TestValidator.equals("subscription id is stable", updated.id, originalId);
  TestValidator.equals(
    "seller id remains unchanged",
    updated.seller_id,
    originalSellerId,
  );
  TestValidator.equals(
    "started_at remains unchanged",
    updated.started_at,
    originalStartedAt,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // Plan association should be updated to Plan B
  TestValidator.equals(
    "subscription plan switched to Plan B",
    updated.seller_subscription_plan_id,
    planB.id,
  );

  // Currency should remain consistent and equal to plan B currency
  TestValidator.equals(
    "currency consistent with plan B",
    updated.currency,
    planB.currency,
  );

  // Monetary fields reflect plan B pricing and requested discount
  TestValidator.equals(
    "price_amount updated to plan B price",
    updated.price_amount,
    planB.price_amount,
  );
  TestValidator.equals(
    "discount_amount updated to requested value",
    updated.discount_amount,
    updateBody.discount_amount,
  );

  // Next billing timestamp should be updated to requested value
  TestValidator.equals(
    "next_billing_at updated to new schedule",
    updated.next_billing_at,
    nextBillingForPlanB,
  );

  // updated_at must be bumped (greater or equal in case of same-ms rounding)
  TestValidator.predicate(
    "updated_at is bumped after update",
    new Date(updated.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
