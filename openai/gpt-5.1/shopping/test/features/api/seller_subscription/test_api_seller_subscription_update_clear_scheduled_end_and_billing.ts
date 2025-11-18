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
 * Validate clearing scheduled end and next billing timestamps on a seller
 * subscription via admin update.
 *
 * Business context: An administrator manages seller subscriptions to plans. A
 * subscription may initially be configured with a scheduled end (`ended_at`)
 * and a next billing timestamp (`next_billing_at`). Later, business decisions
 * may require making the subscription open-ended again, removing those
 * scheduled timestamps while keeping the subscription active.
 *
 * This test verifies that the update endpoint correctly handles setting
 * nullable temporal fields to `null` through
 * `IShoppingMallSellerSubscription.IUpdate`.
 *
 * End-to-end flow:
 *
 * 1. Admin joins the platform to obtain an authenticated admin context.
 * 2. Admin creates a seller subscription plan.
 * 3. Admin creates a seller subscription bound to that plan with non-null
 *    `ended_at` and `next_billing_at` timestamps.
 * 4. Admin calls the update API, explicitly setting `ended_at` and
 *    `next_billing_at` to `null` and status to an ongoing value ("active").
 * 5. Validate that:
 *
 *    - `ended_at` and `next_billing_at` are now `null` in the response.
 *    - `status` is "active".
 *    - Identity and pricing fields are unchanged.
 *    - `created_at` is unchanged while `updated_at` has advanced.
 */
export async function test_api_seller_subscription_update_clear_scheduled_end_and_billing(
  connection: api.IConnection,
) {
  // 1. Admin joins (authentication context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test/join",
    referrer: "https://admin.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: "Standard Seller Plan",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert(plan);

  // 3. Create a seller subscription with non-null ended_at and next_billing_at
  const startedAt = now.toISOString();
  const endedAtInitial = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const nextBillingAtInitial = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "scheduled_end",
    started_at: startedAt,
    ended_at: endedAtInitial,
    next_billing_at: nextBillingAtInitial,
    currency: plan.currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const created: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(created);

  // Sanity checks on created subscription
  TestValidator.equals(
    "created subscription plan id should match input",
    created.seller_subscription_plan_id,
    subscriptionCreateBody.seller_subscription_plan_id,
  );
  TestValidator.equals(
    "created subscription seller id should match input",
    created.seller_id,
    subscriptionCreateBody.seller_id,
  );
  TestValidator.equals(
    "created subscription ended_at should be non-null",
    created.ended_at,
    endedAtInitial,
  );
  TestValidator.equals(
    "created subscription next_billing_at should be non-null",
    created.next_billing_at,
    nextBillingAtInitial,
  );

  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 4. Update subscription: clear ended_at and next_billing_at, set status to active
  const updateBody = {
    status: "active",
    ended_at: null,
    next_billing_at: null,
  } satisfies IShoppingMallSellerSubscription.IUpdate;

  const updated: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate post-update state
  TestValidator.equals(
    "subscription id remains unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "seller id remains unchanged after update",
    updated.seller_id,
    created.seller_id,
  );
  TestValidator.equals(
    "plan id remains unchanged after update",
    updated.seller_subscription_plan_id,
    created.seller_subscription_plan_id,
  );
  TestValidator.equals(
    "currency remains unchanged after update",
    updated.currency,
    created.currency,
  );
  TestValidator.equals(
    "price_amount remains unchanged after update",
    updated.price_amount,
    created.price_amount,
  );
  TestValidator.equals(
    "discount_amount remains unchanged after update",
    updated.discount_amount,
    created.discount_amount,
  );

  TestValidator.equals(
    "ended_at should be cleared to null after update",
    updated.ended_at,
    null,
  );
  TestValidator.equals(
    "next_billing_at should be cleared to null after update",
    updated.next_billing_at,
    null,
  );
  TestValidator.equals(
    "status should be updated to active",
    updated.status,
    "active",
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    originalUpdatedAt,
  );
}
