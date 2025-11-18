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

export async function test_api_seller_subscription_update_change_status_and_billing_dates(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain admin-authenticated connection
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a seller subscription plan as admin
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const planCreateBody = {
    code: `PLAN-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 99.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create baseline seller subscription
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const startedAt = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nextBillingAt = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAt,
    currency: plan.currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: JSON.stringify({ source: "e2e" }),
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const original: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(original);

  // 4. Prepare update payload to change status and billing dates
  const newNextBillingAt = new Date(
    new Date(nextBillingAt).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const newEndedAt = new Date(
    new Date(newNextBillingAt).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const newStatus = "cancelled";

  const updateBody = {
    status: newStatus,
    next_billing_at: newNextBillingAt,
    ended_at: newEndedAt,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updated: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: original.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updated);

  // 5. Validate invariants and changed fields
  TestValidator.equals(
    "subscription id remains stable",
    updated.id,
    original.id,
  );
  TestValidator.equals(
    "seller id remains stable",
    updated.seller_id,
    original.seller_id,
  );
  TestValidator.equals(
    "plan id remains stable",
    updated.seller_subscription_plan_id,
    original.seller_subscription_plan_id,
  );
  TestValidator.equals("status updated", updated.status, newStatus);
  TestValidator.equals(
    "next_billing_at updated",
    updated.next_billing_at,
    newNextBillingAt,
  );
  TestValidator.equals("ended_at updated", updated.ended_at, newEndedAt);
  TestValidator.equals(
    "currency remains stable",
    updated.currency,
    original.currency,
  );
  TestValidator.equals(
    "price_amount remains stable",
    updated.price_amount,
    original.price_amount,
  );
  TestValidator.equals(
    "discount_amount remains stable",
    updated.discount_amount,
    original.discount_amount,
  );

  TestValidator.predicate(
    "updated_at is not before created_at",
    updated.updated_at >= updated.created_at,
  );
  TestValidator.predicate(
    "updated_at is later than or equal to previous updated_at",
    updated.updated_at >= original.updated_at,
  );

  // 6. Optional: perform a second update to clear ended_at and move next_billing_at further
  const newerNextBillingAt = new Date(
    new Date(newNextBillingAt).getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const secondUpdateBody = {
    ended_at: null,
    next_billing_at: newerNextBillingAt,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updatedAgain: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: original.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updatedAgain);

  TestValidator.equals(
    "ended_at cleared on second update",
    updatedAgain.ended_at,
    null,
  );
  TestValidator.equals(
    "next_billing_at updated on second update",
    updatedAgain.next_billing_at,
    newerNextBillingAt,
  );
  TestValidator.equals(
    "id remains stable after second update",
    updatedAgain.id,
    original.id,
  );
  TestValidator.equals(
    "seller id remains stable after second update",
    updatedAgain.seller_id,
    original.seller_id,
  );
  TestValidator.equals(
    "plan id remains stable after second update",
    updatedAgain.seller_subscription_plan_id,
    original.seller_subscription_plan_id,
  );
  TestValidator.predicate(
    "updated_at keeps moving forward after second update",
    updatedAgain.updated_at >= updated.updated_at,
  );
}
