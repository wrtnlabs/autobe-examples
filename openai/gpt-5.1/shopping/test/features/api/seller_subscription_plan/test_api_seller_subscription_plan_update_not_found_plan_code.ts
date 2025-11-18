import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that updating a non-existent seller subscription plan code fails.
 *
 * Business intent
 *
 * - The admin-only update endpoint for seller subscription plans must behave as a
 *   pure update.
 * - When the target planCode does not exist, the endpoint should respond with a
 *   not-found style error rather than creating a new plan (no upsert
 *   behavior).
 * - The test focuses on ensuring that a random, surely-nonexistent code is
 *   rejected.
 *
 * High level scenario
 *
 * 1. Join as an admin via POST /auth/admin/join to establish an authenticated
 *    admin context (SDK will manage Authorization header automatically).
 * 2. Generate a synthetic planCode that is extremely unlikely to exist, using a
 *    long random string.
 * 3. Build a valid IShoppingMallSellerSubscriptionPlan.IUpdate payload that
 *    changes basic fields such as name, description, billing_period, currency,
 *    price_amount, is_active, effective_from, and effective_until.
 * 4. Call PUT /shoppingMall/admin/sellerSubscriptionPlans/{planCode} with that
 *    non-existent planCode.
 * 5. Assert that the call results in an HttpError, using TestValidator.error,
 *    meaning the update failed as expected and no plan state was returned.
 *
 * Notes and constraints
 *
 * - We do not have any list/search/GET endpoint for subscription plans in this
 *   test context, so we cannot explicitly query to prove that the plan does not
 *   exist before or after the call. Instead, we rely on the not-found error as
 *   the behavioral contract of the endpoint.
 * - The test must not attempt to inspect HTTP status codes; only the fact that an
 *   error is thrown is validated.
 * - The request body must obey IShoppingMallSellerSubscriptionPlan.IUpdate, using
 *   the `satisfies` keyword for type safety.
 */
export async function test_api_seller_subscription_plan_update_not_found_plan_code(
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
  typia.assert(admin);

  // 2. Create a synthetic planCode that is extremely unlikely to exist
  const nonExistentPlanCode: string = `non-existent-plan-${RandomGenerator.alphaNumeric(
    32,
  )}`;

  // 3. Prepare a valid update payload for the plan
  const now = new Date();
  const effectiveFrom = now.toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 199,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  // 4 & 5. Attempt to update the non-existent plan and expect an error
  await TestValidator.error(
    "update non-existent seller subscription plan should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
        connection,
        {
          planCode: nonExistentPlanCode,
          body: updateBody,
        },
      );
    },
  );
}
