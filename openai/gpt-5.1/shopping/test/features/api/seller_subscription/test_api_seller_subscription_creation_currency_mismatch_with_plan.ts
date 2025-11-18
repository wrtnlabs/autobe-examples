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
 * Validate behavior when creating a seller subscription with a currency
 * different from the associated plan's currency.
 *
 * Business context
 *
 * - Admins manage seller subscription plans (including pricing and currency).
 * - Admins also create seller subscriptions that reference a plan.
 * - The system may enforce that a subscription's currency matches its plan, or it
 *   may allow overrides but must behave consistently.
 *
 * Test goals
 *
 * 1. Ensure an admin can join and create a seller subscription plan with a
 *    specific currency (e.g., "USD").
 * 2. Attempt to create a seller subscription referencing that plan while setting a
 *    different currency (e.g., "EUR") in the request body.
 * 3. Verify that the created subscription:
 *
 *    - Is linked to the correct plan id.
 *    - Uses a currency that matches either the plan's currency (normalized) or the
 *         requested mismatching currency, but in a self-consistent way.
 * 4. Confirm price_amount and discount_amount are persisted as requested.
 */
export async function test_api_seller_subscription_creation_currency_mismatch_with_plan(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a seller subscription plan with currency = "USD"
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: effectiveFrom,
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

  // 3. Create a seller subscription that references the plan but uses
  //    a different currency in the request body (e.g., "EUR").
  //
  // We do not have a seller-creation API here, so we generate a random UUID
  // for seller_id just for wiring through the DTO.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const startedAt = new Date().toISOString();
  const nextBillingAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const mismatchingCurrency = "EUR";

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAt,
    currency: mismatchingCurrency,
    price_amount: planCreateBody.price_amount,
    discount_amount: 0,
    metadata_json: JSON.stringify({
      scenario: "currency_mismatch_test",
      requested_currency: mismatchingCurrency,
      plan_currency: plan.currency,
    }),
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(subscription);

  // 4. Business assertions
  // 4-1. Ensure the subscription links to the intended plan.
  TestValidator.equals(
    "subscription should reference the created plan id",
    subscription.seller_subscription_plan_id,
    plan.id,
  );

  // 4-2. Currency behavior policy: we support either strict normalization
  //      to plan.currency or accepting the mismatching request currency,
  //      but we assert that the returned value matches one of those two.
  const currencyMatchesPlan = subscription.currency === plan.currency;
  const currencyMatchesRequest =
    subscription.currency === subscriptionCreateBody.currency;

  await TestValidator.predicate(
    "subscription currency should match either plan currency or requested currency",
    async () => currencyMatchesPlan || currencyMatchesRequest,
  );

  // 4-3. Price and discount amounts should equal the request body.
  TestValidator.equals(
    "subscription price_amount should equal the requested price_amount",
    subscription.price_amount,
    subscriptionCreateBody.price_amount,
  );
  TestValidator.equals(
    "subscription discount_amount should equal the requested discount_amount",
    subscription.discount_amount,
    subscriptionCreateBody.discount_amount,
  );
}
