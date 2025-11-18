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
 * Validate that fetching a seller subscription by an unknown id fails, while
 * the same endpoint still succeeds for an existing subscription.
 *
 * Business intent
 *
 * - Admin tools must not leak internal details when a subscription id does not
 *   exist. The call should fail in a controlled way rather than returning a
 *   fake or unrelated subscription.
 * - At the same time, the endpoint must behave normally when given a real
 *   subscription id created earlier in the test.
 *
 * High-level steps
 *
 * 1. Join as an admin using POST /auth/admin/join so that the connection carries
 *    an admin access token for subsequent calls.
 * 2. Create a seller subscription plan with realistic pricing configuration using
 *    POST /shoppingMall/admin/sellerSubscriptionPlans.
 * 3. Create a seller subscription bound to some seller and that plan using POST
 *    /shoppingMall/admin/sellerSubscriptions, supplying all required temporal
 *    and monetary fields.
 * 4. Generate a fresh random UUID string and ensure it is distinct from the
 *    created subscription id. This value represents an unknown subscription
 *    id.
 * 5. Call GET /shoppingMall/admin/sellerSubscriptions/{subscriptionId} with the
 *    unknown id and assert that the call fails by throwing an HttpError, using
 *    TestValidator.error. The test must not depend on a specific HTTP status
 *    code or error payload; only the fact that an error occurs is asserted.
 * 6. Call the same GET endpoint again, but this time with the valid id from the
 *    created subscription, and assert that a IShoppingMallSellerSubscription
 *    object is returned, that it passes typia.assert, and that its id matches
 *    the original subscription id.
 *
 * Constraints & notes
 *
 * - Do not manipulate connection.headers directly; the SDK is responsible for
 *   injecting the Authorization header after join.
 * - Use proper DTO variants for each request body: IShoppingMallAdminJoin.ICreate
 *   for join, IShoppingMallSellerSubscriptionPlan.ICreate for plan creation,
 *   and IShoppingMallSellerSubscription.ICreate for subscription creation.
 * - Use typia.random and RandomGenerator utilities to build realistic test data
 *   that satisfies tag constraints (email, uri, date-time, etc.).
 * - Use TestValidator.error with an async callback (and await it) to assert that
 *   the unknown id lookup fails, without inspecting the concrete status code or
 *   error payload.
 */
export async function test_api_admin_seller_subscription_get_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create a seller subscription plan as control data
  const now = new Date();
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
  const planBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 99.99,
    is_active: true,
    effective_from: now.toISOString(),
    effective_until: new Date(now.getTime() + oneMonthMs).toISOString(),
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create a seller subscription bound to some seller and this plan
  // We do not have a seller creation API in scope, so use a random
  // UUID to represent an existing seller_id from fixtures.
  const startedAt = new Date();
  const nextBillingAt = new Date(startedAt.getTime() + oneMonthMs);

  const subscriptionBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt.toISOString(),
    ended_at: null,
    next_billing_at: nextBillingAt.toISOString(),
    currency: plan.currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const created: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert<IShoppingMallSellerSubscription>(created);

  // 4. Generate a random UUID that is guaranteed to differ from the
  // created subscription id.
  let unknownId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (unknownId === created.id) {
    unknownId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Assert that GET with unknown id fails by throwing an error.
  await TestValidator.error(
    "getting seller subscription with unknown id should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptions.at(
        connection,
        {
          subscriptionId: unknownId,
        },
      );
    },
  );

  // 6. Assert that GET with the valid id succeeds and matches created
  // subscription id.
  const found: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.at(connection, {
      subscriptionId: created.id,
    });
  typia.assert<IShoppingMallSellerSubscription>(found);

  TestValidator.equals(
    "fetched subscription id must equal created subscription id",
    found.id,
    created.id,
  );
}
