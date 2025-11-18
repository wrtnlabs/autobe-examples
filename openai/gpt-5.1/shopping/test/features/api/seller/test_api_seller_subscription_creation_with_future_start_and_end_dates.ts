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
 * Validate creation of a seller subscription with future lifecycle timestamps.
 *
 * Business context:
 *
 * - An admin user configures subscription plans and assigns them to sellers.
 * - Subscriptions can be scheduled to start and end in the future, with billing
 *   dates also set in the future.
 *
 * This test verifies that:
 *
 * 1. An admin can join and obtain an authorized context for admin APIs.
 * 2. The admin can create an active seller subscription plan whose effective_from
 *    precedes the future subscription started_at.
 * 3. The admin can create a seller subscription whose started_at, ended_at, and
 *    next_billing_at are all in the future.
 * 4. The API accepts those timestamps as-is, persists them without normalization,
 *    and returns them unchanged in the create response.
 * 5. The subscription’s monetary and foreign-key fields match the request payload.
 */
export async function test_api_seller_subscription_creation_with_future_start_and_end_dates(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Shared currency configured with required MinLength tag
  const currency: string & tags.MinLength<1> = "USD";

  // 2. Create an active seller subscription plan whose effective_from is
  //    before the subscription’s future started_at.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const planEffectiveFrom = new Date(now.getTime() + oneDayMs);

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency,
    price_amount: 100,
    is_active: true,
    effective_from: planEffectiveFrom.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Prepare future lifecycle timestamps for the seller subscription
  const startedAt = new Date(now.getTime() + 7 * oneDayMs);
  const endedAt = new Date(now.getTime() + 37 * oneDayMs);
  const nextBillingAt = new Date(startedAt.getTime());

  const startedAtIso = startedAt.toISOString();
  const endedAtIso = endedAt.toISOString();
  const nextBillingAtIso = nextBillingAt.toISOString();

  // Ensure plan.effective_from is not after subscription started_at
  TestValidator.predicate(
    "plan.effective_from must be <= subscription.started_at",
    () => {
      const planFrom = new Date(
        plan.effective_from ?? planCreateBody.effective_from,
      );
      return planFrom.getTime() <= startedAt.getTime();
    },
  );

  // 4. Prepare seller_id as a structurally valid UUID
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Compose subscription creation payload with future timestamps
  const status = "pending";

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status,
    started_at: startedAtIso,
    ended_at: endedAtIso,
    next_billing_at: nextBillingAtIso,
    currency,
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
  typia.assert<IShoppingMallSellerSubscription>(subscription);

  // 6. Business rule validations on the create response
  TestValidator.equals(
    "subscription.seller_subscription_plan_id should equal requested plan id",
    subscription.seller_subscription_plan_id,
    subscriptionCreateBody.seller_subscription_plan_id,
  );

  TestValidator.equals(
    "subscription.seller_id should equal requested seller_id",
    subscription.seller_id,
    subscriptionCreateBody.seller_id,
  );

  TestValidator.equals(
    "subscription.currency should equal requested currency",
    subscription.currency,
    subscriptionCreateBody.currency,
  );

  TestValidator.equals(
    "subscription.price_amount should equal requested price_amount",
    subscription.price_amount,
    subscriptionCreateBody.price_amount,
  );

  TestValidator.equals(
    "subscription.discount_amount should equal requested discount_amount",
    subscription.discount_amount,
    subscriptionCreateBody.discount_amount,
  );

  TestValidator.equals(
    "subscription.status should equal requested status",
    subscription.status,
    subscriptionCreateBody.status,
  );

  TestValidator.equals(
    "subscription.started_at should equal requested started_at",
    subscription.started_at,
    subscriptionCreateBody.started_at,
  );

  TestValidator.equals(
    "subscription.ended_at should equal requested ended_at",
    subscription.ended_at,
    subscriptionCreateBody.ended_at,
  );

  TestValidator.equals(
    "subscription.next_billing_at should equal requested next_billing_at",
    subscription.next_billing_at,
    subscriptionCreateBody.next_billing_at,
  );

  await TestValidator.predicate(
    "subscription.ended_at must be later than started_at",
    async () => {
      const s = new Date(subscription.started_at).getTime();
      const e =
        subscription.ended_at !== null && subscription.ended_at !== undefined
          ? new Date(subscription.ended_at).getTime()
          : NaN;
      return Number.isFinite(e) && e > s;
    },
  );

  await TestValidator.predicate(
    "subscription.next_billing_at must be on or after started_at",
    async () => {
      const s = new Date(subscription.started_at).getTime();
      const n =
        subscription.next_billing_at !== null &&
        subscription.next_billing_at !== undefined
          ? new Date(subscription.next_billing_at).getTime()
          : NaN;
      return Number.isFinite(n) && n >= s;
    },
  );
}
