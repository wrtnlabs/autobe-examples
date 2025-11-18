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
 * Validate that admin-side seller subscription creation fails when referencing
 * a non-existent subscription plan.
 *
 * Business goal: Ensure that POST /shoppingMall/admin/sellerSubscriptions
 * enforces the prerequisite that seller_subscription_plan_id must reference a
 * valid existing plan. When an admin attempts to create a seller subscription
 * with a syntactically valid but non-existent plan id, the API must reject the
 * request and must not return a successful IShoppingMallSellerSubscription
 * object.
 *
 * Scenario steps:
 *
 * 1. Create an admin account and establish authenticated context using POST
 *    /auth/admin/join. This gives us an IShoppingMallAdmin.IAuthorized response
 *    and configures the connection headers via the SDK.
 * 2. Prepare a subscription creation payload that satisfies
 *    IShoppingMallSellerSubscription.ICreate:
 *
 *    - Seller_id: syntactically valid UUID (typia.random)
 *    - Seller_subscription_plan_id: a different syntactically valid UUID that is
 *         extremely unlikely to correspond to any existing plan (also
 *         typia.random). Because we have no plan-creation API in the provided
 *         materials, we rely on this being treated as non-existent by the
 *         backend.
 *    - Status: some valid non-empty string (e.g., "active").
 *    - Started_at: current timestamp in ISO-8601 format.
 *    - Ended_at: null (optional field, explicit null to show we’re not scheduling an
 *         end date yet).
 *    - Next_billing_at: null (no next billing scheduled explicitly).
 *    - Currency: a non-empty currency code string (e.g., "USD").
 *    - Price_amount: positive number (e.g., 1000).
 *    - Discount_amount: zero (no discount applied).
 *    - Metadata_json: null (no extra metadata).
 * 3. Invoke api.functional.shoppingMall.admin.sellerSubscriptions.create with the
 *    above body and assert that it throws using await
 *    TestValidator.error("...", async () => { ... }). We don’t inspect the
 *    error type or status code, we only care that an error is thrown instead of
 *    a normal response.
 * 4. We do not attempt to verify persistence via listing or GET APIs, as no such
 *    endpoints are provided in the materials. The existence of an error is
 *    sufficient to conclude that invalid plan reference is not accepted.
 */
export async function test_api_seller_subscription_creation_invalid_plan_reference(
  connection: api.IConnection,
) {
  // 1. Admin join / authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare invalid plan reference payload for seller subscription creation
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentPlanId = typia.random<string & tags.Format<"uuid">>();

  const nowIso = new Date().toISOString();

  const createBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: nonExistentPlanId,
    status: "active",
    started_at: nowIso,
    ended_at: null,
    next_billing_at: null,
    currency: "USD",
    price_amount: 1000,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  // 3. Attempt to create subscription and assert that it fails
  await TestValidator.error(
    "creating subscription with non-existent plan id must fail",
    async () => {
      await api.functional.shoppingMall.admin.sellerSubscriptions.create(
        connection,
        {
          body: createBody,
        },
      );
    },
  );
}
