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
 * Validate creation of an admin-driven seller subscription with discount and
 * metadata.
 *
 * Business goal: Ensure that an administrator can create a seller subscription
 * bound to a specific subscription plan, with monetary amounts and JSON
 * metadata handled correctly. The subscription must reference a known plan,
 * apply a per-period discount, and persist arbitrary JSON metadata as a
 * string.
 *
 * Steps:
 *
 * 1. Create an admin account using POST /auth/admin/join so that subsequent
 *    admin-only endpoints (plan and subscription creation) are authorized.
 * 2. Create a seller subscription plan using POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with deterministic fields:
 *
 *    - Code: a unique string
 *    - Name: random but human readable
 *    - Billing_period: e.g. "monthly"
 *    - Currency: e.g. "USD"
 *    - Price_amount: e.g. 100
 *    - Is_active: true
 *    - Effective_from: now
 *    - Effective_until: null
 * 3. Choose a seller_id to attach the subscription to. As there is no seller
 *    creation endpoint in the given SDK, this id is generated as a random UUID
 *    purely to satisfy type constraints; the test focuses on monetary and
 *    metadata behavior of the subscription itself, not on seller existence.
 * 4. Build an IShoppingMallSellerSubscription.ICreate body:
 *
 *    - Seller_id: the generated UUID
 *    - Seller_subscription_plan_id: id of the created plan
 *    - Status: "active"
 *    - Started_at: current date-time in ISO 8601
 *    - Ended_at: null
 *    - Next_billing_at: a future date-time (e.g. +30 days)
 *    - Currency: same as plan.currency
 *    - Price_amount: plan.price_amount
 *    - Discount_amount: 20 (less than price_amount)
 *    - Metadata_json: a JSON string
 *         '{"source":"campaign","campaignCode":"SPRING24"}'
 * 5. Call POST /shoppingMall/admin/sellerSubscriptions with the above body and
 *    capture the IShoppingMallSellerSubscription response.
 * 6. Run validations:
 *
 *    - Use typia.assert on the response to ensure structural correctness.
 *    - Verify price_amount and discount_amount match the input values.
 *    - Compute expectedEffective = price_amount - discount_amount and assert that it
 *         is positive and equals 80 given the chosen numbers.
 *    - Verify currency, status, and metadata_json echo the request values.
 *    - Verify started_at and next_billing_at are non-null strings.
 *    - When the backend populates seller and plan summaries, ensure that plan.id and
 *         plan.code match the created plan, and seller.id matches the chosen
 *         seller_id.
 *
 * No negative or type-error cases are implemented: the test only covers the
 * happy path with valid data and does not attempt to send wrong types or
 * missing required fields.
 */
export async function test_api_seller_subscription_creation_with_discount_and_metadata(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a deterministic seller subscription plan
  const now = new Date();
  const effectiveFrom = now.toISOString();

  const planCreateBody = {
    code: `PLAN-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
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
      { body: planCreateBody },
    );
  typia.assert(plan);

  // 3. Choose a seller_id (random UUID for test focus on monetary/metadata)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Build subscription creation payload
  const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startedAt = now.toISOString();
  const nextBillingAt = nextBillingDate.toISOString();

  const discountAmount = 20;
  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAt,
    currency: plan.currency satisfies string as string,
    price_amount: plan.price_amount,
    discount_amount: discountAmount,
    metadata_json: '{"source":"campaign","campaignCode":"SPRING24"}',
  } satisfies IShoppingMallSellerSubscription.ICreate;

  // 5. Create seller subscription
  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 6. Business and echo validations
  TestValidator.equals(
    "subscription price_amount echoes request",
    subscription.price_amount,
    subscriptionCreateBody.price_amount,
  );
  TestValidator.equals(
    "subscription discount_amount echoes request",
    subscription.discount_amount,
    subscriptionCreateBody.discount_amount,
  );
  TestValidator.equals(
    "subscription currency echoes request",
    subscription.currency,
    subscriptionCreateBody.currency,
  );
  TestValidator.equals(
    "subscription status echoes request",
    subscription.status,
    subscriptionCreateBody.status,
  );
  TestValidator.equals(
    "subscription metadata_json echoes request",
    subscription.metadata_json,
    subscriptionCreateBody.metadata_json,
  );

  const expectedEffective =
    subscriptionCreateBody.price_amount -
    subscriptionCreateBody.discount_amount;
  TestValidator.predicate(
    "effective per-period price is positive",
    expectedEffective > 0,
  );
  TestValidator.equals(
    "effective per-period price matches subtraction",
    expectedEffective,
    subscription.price_amount - subscription.discount_amount,
  );

  TestValidator.predicate(
    "started_at is non-null string",
    subscription.started_at !== null &&
      subscription.started_at !== undefined &&
      subscription.started_at.length > 0,
  );
  TestValidator.predicate(
    "next_billing_at is non-null string",
    subscription.next_billing_at !== null &&
      subscription.next_billing_at !== undefined &&
      subscription.next_billing_at.length > 0,
  );

  if (subscription.plan !== undefined) {
    TestValidator.equals(
      "plan summary id matches created plan",
      subscription.plan.id,
      plan.id,
    );
    TestValidator.equals(
      "plan summary code matches created plan",
      subscription.plan.code,
      plan.code,
    );
  }

  if (subscription.seller !== undefined) {
    TestValidator.equals(
      "seller summary id matches chosen seller_id",
      subscription.seller.id,
      sellerId,
    );
  }
}
