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
 * Validate that deleting a seller subscription without admin authentication is
 * rejected.
 *
 * Business purpose
 *
 * - Deleting seller subscriptions is a sensitive administrative operation that
 *   must be restricted to authenticated admins only.
 * - This test ensures that the DELETE endpoint for seller subscriptions enforces
 *   authorization and does not allow unauthenticated callers to perform hard
 *   deletions.
 *
 * Flow
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an admin context and
 *    token.
 * 2. Create a seller subscription plan with POST
 *    /shoppingMall/admin/sellerSubscriptionPlans so that we have a valid plan
 *    id.
 * 3. Create a seller subscription with POST
 *    /shoppingMall/admin/sellerSubscriptions using the created plan id and a
 *    random seller_id.
 * 4. Build an unauthenticated connection (no Authorization header).
 * 5. Call DELETE /shoppingMall/admin/sellerSubscriptions/{subscriptionId} using
 *    the unauthenticated connection and expect an authorization error.
 * 6. Validate that an HTTP error with status 401 or 403 is thrown.
 */
export async function test_api_admin_delete_seller_subscription_unauthorized(
  connection: api.IConnection,
) {
  // 1. Join as an admin to get authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller subscription plan
  const planBody = typia.random<IShoppingMallSellerSubscriptionPlan.ICreate>();
  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planBody,
      },
    );
  typia.assert(plan);

  // 3. Create a seller subscription targeting that plan
  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: {
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          seller_subscription_plan_id: plan.id,
          status: "active",
          started_at: new Date().toISOString(),
          ended_at: null,
          next_billing_at: null,
          currency: "USD",
          price_amount: 100,
          discount_amount: 0,
          metadata_json: null,
        } satisfies IShoppingMallSellerSubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // 4. Build an unauthenticated connection with empty headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt to delete the subscription without authorization
  await TestValidator.httpError(
    "unauthorized delete of seller subscription must fail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptions.erase(
        unauthenticated,
        {
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
