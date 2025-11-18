import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Verify that an admin cannot create two seller subscription plans with the
 * same business `code`.
 *
 * ## Business context
 *
 * Seller subscription plans are configured by administrators via
 * `shopping_mall_seller_subscription_plans`. The `code` field is a stable
 * business identifier (e.g., BASIC, PRO, ENTERPRISE) and is constrained by a
 * unique index (@@unique([code])). Multiple plans sharing the same `code` must
 * be rejected at the API boundary so that configuration, reporting, and
 * integrations can safely rely on `code` as a unique key.
 *
 * This E2E test exercises that uniqueness contract at the API level by
 * attempting to create two plans with the same `code` under an authenticated
 * admin context.
 *
 * ## Step-by-step scenario
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    session and tokens (handled automatically by the SDK connection object).
 * 2. As that admin, call POST /shoppingMall/admin/sellerSubscriptionPlans with a
 *    well-formed `IShoppingMallSellerSubscriptionPlan.ICreate` payload using a
 *    specific `code` (e.g., "PREMIUM-PLAN"). Ensure all mandatory fields (name,
 *    billing_period, currency, price_amount, is_active, effective_from) are
 *    populated with realistic values.
 * 3. Assert that the first creation succeeds, the response is a valid
 *    `IShoppingMallSellerSubscriptionPlan`, and that the `code` property of the
 *    created plan exactly matches the requested `code` string.
 * 4. Attempt to create a second plan via the same endpoint with:
 *
 *    - The _same_ `code` value.
 *    - Other fields (such as `name` or `price_amount`) optionally changed to prove
 *         that only `code` drives the uniqueness check.
 * 5. Expect this second creation attempt to fail with a runtime error (e.g., due
 *    to DB unique constraint violation). Use `await TestValidator.error` with a
 *    descriptive title to assert that an error is thrown when invoking the
 *    duplicate create call.
 * 6. Because no read-by-code or listing API for plans is provided in the SDK, the
 *    test does not inspect the persisted plan count. Instead, it treats the
 *    failure of the second POST call as sufficient evidence that the uniqueness
 *    constraint on `code` is enforced.
 */
export async function test_api_admin_cannot_create_duplicate_seller_subscription_plan_code(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. First seller subscription plan creation with a unique code
  const planCode = "PREMIUM-PLAN";

  const firstPlanBody = {
    code: planCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: firstPlanBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(createdPlan);

  // Validate that the created plan uses the requested code
  TestValidator.equals(
    "created plan code must match the requested code",
    createdPlan.code,
    planCode,
  );

  // 3. Attempt to create a second plan with the same code
  const duplicatePlanBody = {
    code: planCode, // same business identifier to trigger unique constraint
    name: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 150, // different price, but should not matter for uniqueness
    is_active: true,
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  await TestValidator.error(
    "duplicate seller subscription plan code must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
        connection,
        {
          body: duplicatePlanBody,
        },
      );
    },
  );
}
