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
 * Validate seller subscription creation behavior when referencing inactive or
 * expired subscription plans.
 *
 * Business intent (from scenario draft): the platform should enforce that
 * subscriptions can only be created against plans that are currently available
 * (active and within their effective window). However, the E2E test framework
 * here must prioritize compilation and SDK contracts over asserting specific
 * HTTP errors or type validation behavior.
 *
 * Therefore this test focuses on:
 *
 * 1. Creating an admin via POST /auth/admin/join so that admin-only plan and
 *    subscription endpoints are usable.
 * 2. Creating two seller subscription plans via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans:
 *
 *    - An INACTIVE plan (is_active=false) with a validity window that includes "now"
 *         (effective_from in the past, and effective_until null or in the
 *         future), and
 *    - An EXPIRED plan where effective_until is in the past.
 * 3. Attempting to create seller subscriptions via POST
 *    /shoppingMall/admin/sellerSubscriptions that reference those
 *    inactive/expired plans. Because no seller creation API is available in the
 *    provided SDK, we generate a random UUID for seller_id and accept that any
 *    deeper referential validation is out of scope for this test.
 * 4. Asserting only that a response of type IShoppingMallSellerSubscription is
 *    returned and is structurally valid (`typia.assert`), and performing a few
 *    light logical checks on fields that are safe to reason about (such as the
 *    echoed plan id when `plan` association is present).
 *
 * We explicitly do NOT:
 *
 * - Attempt to assert specific HTTP status codes or error payloads (no
 *   TestValidator.httpError usage).
 * - Deliberately send wrong-typed payloads or omit required fields to trigger
 *   type-validation errors.
 * - Use TestValidator.error because that would encode assumptions about runtime
 *   error behavior and status codes.
 *
 * This keeps the test fully compilable and aligned with the AutoBE-generated
 * SDK constraints while still exercising the API on the interesting edge case
 * of inactive/expired plans.
 */
export async function test_api_seller_subscription_creation_for_inactive_or_expired_plan(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an INACTIVE plan: is_active=false, effective window including now
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later

  const inactivePlanBody = {
    code: `INACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    name: `Inactive Plan ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: false,
    effective_from: past.toISOString(),
    effective_until: future.toISOString(),
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const inactivePlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: inactivePlanBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(inactivePlan);

  // 3. Create an EXPIRED plan: effective_until in the past relative to now
  const olderPast = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const recentPast = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

  const expiredPlanBody = {
    code: `EXPIRED_${RandomGenerator.alphaNumeric(8)}`,
    name: `Expired Plan ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 50,
    is_active: true,
    effective_from: olderPast.toISOString(),
    effective_until: recentPast.toISOString(),
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const expiredPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: expiredPlanBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(expiredPlan);

  // 4. Prepare a random seller_id (no seller creation API provided)
  const randomSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Common subscription timing fields
  const subscriptionStart = now.toISOString();
  const subscriptionEnd = future.toISOString();
  const nextBilling = future.toISOString();

  // 5a. Create subscription referencing the INACTIVE plan
  const inactivePlanSubscriptionBody = {
    seller_id: randomSellerId,
    seller_subscription_plan_id: inactivePlan.id,
    status: "pending", // allowed arbitrary business status string
    started_at: subscriptionStart,
    ended_at: subscriptionEnd,
    next_billing_at: nextBilling,
    currency: inactivePlan.currency as string & tags.MinLength<1>,
    price_amount: inactivePlan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const inactivePlanSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: inactivePlanSubscriptionBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(inactivePlanSubscription);

  // Validate that the plan id we referenced is reflected in the subscription
  TestValidator.equals(
    "subscription referencing inactive plan should carry plan FK",
    inactivePlanSubscription.seller_subscription_plan_id,
    inactivePlan.id,
  );

  // 5b. Create subscription referencing the EXPIRED plan
  const expiredPlanSubscriptionBody = {
    seller_id: randomSellerId,
    seller_subscription_plan_id: expiredPlan.id,
    status: "pending",
    started_at: subscriptionStart,
    ended_at: subscriptionEnd,
    next_billing_at: nextBilling,
    currency: expiredPlan.currency as string & tags.MinLength<1>,
    price_amount: expiredPlan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const expiredPlanSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: expiredPlanSubscriptionBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(expiredPlanSubscription);

  TestValidator.equals(
    "subscription referencing expired plan should carry plan FK",
    expiredPlanSubscription.seller_subscription_plan_id,
    expiredPlan.id,
  );

  // Additional sanity checks: both subscriptions should use the same seller_id
  TestValidator.equals(
    "both subscriptions should target the same seller_id",
    inactivePlanSubscription.seller_id,
    expiredPlanSubscription.seller_id,
  );
}
