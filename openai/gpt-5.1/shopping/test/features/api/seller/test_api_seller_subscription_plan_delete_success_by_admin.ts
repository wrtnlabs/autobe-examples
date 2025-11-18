import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that an authenticated admin can successfully delete an existing
 * seller subscription plan by its business plan code.
 *
 * Business context:
 *
 * - Admins manage the catalog of seller subscription plans, each identified by a
 *   stable business code (IShoppingMallSellerSubscriptionPlan.code).
 * - Plans are created via the admin-only create endpoint and deleted via the
 *   admin-only erase endpoint which takes planCode as a path parameter.
 * - Erase() is a void-returning operation representing 200/204 success on
 *   completion and throwing on error conditions (e.g., unknown planCode).
 *
 * Scenario steps:
 *
 * 1. Register a new admin with POST /auth/admin/join. This call both creates the
 *    admin in shopping_mall_admins and establishes an authenticated context by
 *    setting connection.headers.Authorization from the returned token.
 * 2. As this admin, create a new seller subscription plan using POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with a unique plan code and
 *    valid configuration (billing_period, currency, price_amount, is_active,
 *    effective_from, optional description/effective_until).
 * 3. Capture the plan code from the creation response.
 * 4. Call DELETE /shoppingMall/admin/sellerSubscriptionPlans/{planCode} via the
 *    erase() SDK with the captured code while still authenticated as admin.
 * 5. Assert that the erase() call completes without throwing (void response),
 *    which represents successful deletion.
 * 6. Attempt to delete the same plan a second time and assert that an error is
 *    thrown, proving that the plan is no longer deletable because it no longer
 *    exists.
 *
 * Note: The specification mentions GET/list endpoints for verifying deletion,
 * but only create() and erase() SDK functions are available in this context.
 * Therefore, the test validates deletion indirectly by expecting the second
 * delete attempt to fail rather than checking via a retrieval API.
 */
export async function test_api_seller_subscription_plan_delete_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new seller subscription plan as this admin
  const planCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: RandomGenerator.pick(["monthly", "yearly"] as const),
    currency: RandomGenerator.pick(["USD", "KRW"] as const),
    price_amount: 10000,
    is_active: true,
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert(createdPlan);

  // Basic sanity check that code round-trips
  TestValidator.equals(
    "created plan code should match request code",
    createdPlan.code,
    planCreateBody.code,
  );

  // 3. Delete the plan by its business code
  await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
    connection,
    {
      planCode: createdPlan.code,
    },
  );

  // 4. Attempt to delete the same plan again and expect an error
  await TestValidator.error(
    "second delete should fail for non-existing plan",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.erase(
        connection,
        {
          planCode: createdPlan.code,
        },
      );
    },
  );
}
