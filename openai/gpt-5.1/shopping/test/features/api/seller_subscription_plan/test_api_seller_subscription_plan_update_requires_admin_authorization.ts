import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Verify that updating seller subscription plans requires admin authorization.
 *
 * Business goals:
 *
 * - Ensure that the PUT /shoppingMall/admin/sellerSubscriptionPlans/{planCode}
 *   endpoint cannot be used without a valid admin token.
 * - Ensure that when called with a valid admin token, the update succeeds and the
 *   returned plan reflects the applied changes.
 *
 * Test workflow:
 *
 * 1. Create an admin with POST /auth/admin/join and let the SDK attach the
 *    Authorization header (access token) to the connection.
 * 2. As the admin, create a seller subscription plan with POST
 *    /shoppingMall/admin/sellerSubscriptionPlans and capture its code.
 * 3. Build an unauthenticated connection (same host/options but headers: {}) and
 *    attempt to call the update endpoint. Expect an error and verify it using
 *    TestValidator.error, ensuring that unauthenticated access is rejected.
 * 4. Call the update endpoint again on the original authenticated connection with
 *    a valid IShoppingMallSellerSubscriptionPlan.IUpdate payload, assert that
 *    the call succeeds and the updated plan has the new name.
 */
export async function test_api_seller_subscription_plan_update_requires_admin_authorization(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized connection (SDK sets token)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan as admin
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
      { body: createBody },
    );
  typia.assert(createdPlan);

  // 3. Try to update without Authorization header
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const unauthUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  await TestValidator.error(
    "unauthenticated update must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
        unauthConnection,
        {
          planCode: createdPlan.code,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 4. Successful update with admin authorization
  const authUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  const updatedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: authUpdateBody,
      },
    );
  typia.assert(updatedPlan);

  TestValidator.equals(
    "updated plan must reflect new name",
    updatedPlan.name,
    authUpdateBody.name,
  );
}
