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
 * Validate that an admin can delete an existing active seller subscription.
 *
 * Business flow under test:
 *
 * 1. Register a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context (token is set automatically on connection).
 * 2. As this admin, create a seller subscription plan using POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with
 *    IShoppingMallSellerSubscriptionPlan.ICreate.
 * 3. Create an active seller subscription via POST
 *    /shoppingMall/admin/sellerSubscriptions with
 *    IShoppingMallSellerSubscription.ICreate, referencing the created plan and
 *    using a random seller_id UUID plus realistic price/currency values.
 * 4. Call DELETE /shoppingMall/admin/sellerSubscriptions/{subscriptionId} using
 *    api.functional.shoppingMall.admin.sellerSubscriptions.erase with the id
 *    returned from step 3.
 * 5. Verify that:
 *
 *    - All creation responses match their DTOs via typia.assert.
 *    - The erase call completes successfully (no error thrown).
 *    - Basic logical expectations hold (e.g., created subscription id is a UUID
 *         string, and we can at least assert that the subscription existed
 *         before deletion).
 */
export async function test_api_admin_delete_active_seller_subscription(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a seller subscription plan
  const nowIso = new Date().toISOString();
  const planBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 49.99,
    is_active: true,
    effective_from: nowIso as string & tags.Format<"date-time">,
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create an active seller subscription for a random seller
  const startedAt = new Date().toISOString();
  const nextBillingAt = new Date(
    new Date().getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const subscriptionBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt as string & tags.Format<"date-time">,
    ended_at: null,
    next_billing_at: nextBillingAt as string & tags.Format<"date-time">,
    currency: plan.currency as string & tags.MinLength<1>,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const subscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert<IShoppingMallSellerSubscription>(subscription);

  TestValidator.predicate(
    "created subscription id must be non-empty UUID string",
    typeof subscription.id === "string" && subscription.id.length > 0,
  );

  // 4. Delete the created seller subscription
  await api.functional.shoppingMall.admin.sellerSubscriptions.erase(
    connection,
    {
      subscriptionId: subscription.id,
    },
  );
}
