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

export async function test_api_seller_subscription_creation_basic_active_plan(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains JWT via SDK side-effect
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: "P@ssw0rd-Admin",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create an active seller subscription plan
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = null;

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 3. Prepare a seller_id fixture (assumed existing seller)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build seller subscription create payload
  const startedAt = new Date().toISOString();
  const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextBillingAt = nextBillingDate.toISOString();
  const metadata = JSON.stringify({ source: "e2e-test", scenario: "basic" });

  // Resolve currency to match the tagged type requirement (MinLength<1>)
  const currency: string & tags.MinLength<1> =
    plan.currency satisfies string as string;

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAt,
    currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: metadata,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  // 5. Create seller subscription
  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(subscription);

  // 6. Validate response fields
  TestValidator.equals(
    "seller_id is propagated",
    subscription.seller_id,
    subscriptionCreateBody.seller_id,
  );
  TestValidator.equals(
    "plan id is propagated",
    subscription.seller_subscription_plan_id,
    subscriptionCreateBody.seller_subscription_plan_id,
  );
  TestValidator.equals(
    "status is active",
    subscription.status,
    subscriptionCreateBody.status,
  );
  TestValidator.equals(
    "started_at matches",
    subscription.started_at,
    subscriptionCreateBody.started_at,
  );
  TestValidator.equals(
    "ended_at is null as requested",
    subscription.ended_at ?? null,
    subscriptionCreateBody.ended_at,
  );
  TestValidator.equals(
    "next_billing_at matches",
    subscription.next_billing_at ?? null,
    subscriptionCreateBody.next_billing_at,
  );
  TestValidator.equals(
    "currency matches",
    subscription.currency,
    subscriptionCreateBody.currency,
  );
  TestValidator.equals(
    "price_amount matches",
    subscription.price_amount,
    subscriptionCreateBody.price_amount,
  );
  TestValidator.equals(
    "discount_amount matches",
    subscription.discount_amount,
    subscriptionCreateBody.discount_amount,
  );
  TestValidator.equals(
    "metadata_json matches",
    subscription.metadata_json ?? null,
    subscriptionCreateBody.metadata_json,
  );

  // created_at / updated_at are structurally validated by typia; ensure deleted_at is null
  TestValidator.equals(
    "deleted_at is null on creation",
    subscription.deleted_at ?? null,
    null,
  );

  // When seller summary is present, verify its id matches seller_id
  if (subscription.seller !== undefined) {
    typia.assert(subscription.seller);
    TestValidator.equals(
      "seller summary id matches seller_id",
      subscription.seller.id,
      sellerId,
    );
  }

  // When plan summary is present, verify key fields
  if (subscription.plan !== undefined) {
    typia.assert(subscription.plan);
    TestValidator.equals(
      "plan summary id matches plan.id",
      subscription.plan.id,
      plan.id,
    );
    TestValidator.equals(
      "plan summary code matches",
      subscription.plan.code,
      plan.code,
    );
    TestValidator.equals(
      "plan summary billing_period matches",
      subscription.plan.billing_period,
      plan.billing_period,
    );
    TestValidator.equals(
      "plan summary currency matches",
      subscription.plan.currency,
      plan.currency,
    );
    TestValidator.equals(
      "plan summary price_amount matches",
      subscription.plan.price_amount,
      plan.price_amount,
    );
    TestValidator.equals(
      "plan summary is_active matches",
      subscription.plan.is_active,
      plan.is_active,
    );
  }
}
