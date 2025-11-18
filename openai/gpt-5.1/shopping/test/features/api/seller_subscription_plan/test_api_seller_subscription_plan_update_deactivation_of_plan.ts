import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate admin-driven deactivation of a seller subscription plan.
 *
 * Business goal
 *
 * - Ensure that an administrator can safely deactivate an existing seller
 *   subscription plan via PUT
 *   /shoppingMall/admin/sellerSubscriptionPlans/{planCode}.
 * - Verify that only mutable business fields are changed (is_active), while
 *   immutable identity fields such as id and code remain stable.
 *
 * Flow
 *
 * 1. Register an admin using POST /auth/admin/join.
 *
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() to generate a valid join
 *         payload so that all required fields (email, password, href, referrer,
 *         optional ip) are satisfied.
 *    - The join SDK call automatically injects the admin access token into the
 *         connection, so no explicit header manipulation is required.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized structure with
 *         typia.assert.
 * 2. As the authenticated admin, create an active seller subscription plan using
 *    POST /shoppingMall/admin/sellerSubscriptionPlans.
 *
 *    - Build a request body that satisfies
 *         IShoppingMallSellerSubscriptionPlan.ICreate with realistic business
 *         values:
 *
 *         - Code: some string identifier (e.g., RandomGenerator.alphaNumeric).
 *         - Name: RandomGenerator.name().
 *         - Description: RandomGenerator.paragraph() (optional).
 *         - Billing_period: a simple literal like "monthly".
 *         - Currency: a simple code like "USD" or "KRW".
 *         - Price_amount: a non-negative number, e.g. 10000.
 *         - Is_active: true (so it is initially active).
 *         - Effective_from: an ISO date-time string in the past, for example by taking
 *                   new Date() minus some delta and converting with
 *                   toISOString().
 *         - Effective_until: null, explicitly, to represent an open-ended plan.
 *    - Call api.functional.shoppingMall.admin.sellerSubscriptionPlans.create with
 *         that body.
 *    - Assert the response as IShoppingMallSellerSubscriptionPlan using
 *         typia.assert.
 *    - Capture key fields from the response: id, code, is_active, billing_period,
 *         currency, price_amount, effective_from, effective_until, created_at,
 *         updated_at.
 *    - Validate basic expectations using TestValidator:
 *
 *         - Is_active is true after creation.
 *         - Effective_from equals the requested value (string equality).
 *         - Effective_until is null as requested.
 * 3. Deactivate the plan via PUT
 *    /shoppingMall/admin/sellerSubscriptionPlans/{planCode}.
 *
 *    - Prepare an IShoppingMallSellerSubscriptionPlan.IUpdate body that only sets
 *         is_active to false. All other fields should be omitted so that the
 *         server performs a minimal patch.
 *    - Call api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(connection,
 *         { planCode: created.code, body: { is_active: false } satisfies
 *         IShoppingMallSellerSubscriptionPlan.IUpdate }).
 *    - Assert the response type using typia.assert.
 * 4. Validate update semantics on the response.
 *
 *    - Using TestValidator.equals, confirm that:
 *
 *         - Id in the updated record is equal to the original id.
 *         - Code in the updated record is equal to the original code.
 *         - Is_active in the updated record is false.
 *         - Billing_period, currency, price_amount, effective_from, effective_until are
 *                   unchanged compared to the originally created plan.
 *    - Optionally, assert that updated_at has changed (i.e., notEquals vs the
 *         original updated_at) to reflect the update operation.
 * 5. No further visibility/search checks.
 *
 *    - Since there is no search or GET-by-code API exposed in the SDK materials,
 *         relying on the update response itself is sufficient: it represents
 *         the persisted state after deactivation.
 */
export async function test_api_seller_subscription_plan_update_deactivation_of_plan(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initially active seller subscription plan.
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 10000,
    is_active: true,
    effective_from: past.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(createdPlan);

  // Sanity checks on created plan.
  TestValidator.predicate(
    "created plan must be active",
    createdPlan.is_active === true,
  );
  TestValidator.equals(
    "effective_from must match request",
    createdPlan.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "effective_until must be null on creation",
    createdPlan.effective_until ?? null,
    createBody.effective_until,
  );

  const originalId = createdPlan.id;
  const originalCode = createdPlan.code;
  const originalBillingPeriod = createdPlan.billing_period;
  const originalCurrency = createdPlan.currency;
  const originalPriceAmount = createdPlan.price_amount;
  const originalEffectiveFrom = createdPlan.effective_from;
  const originalEffectiveUntil = createdPlan.effective_until ?? null;
  const originalUpdatedAt = createdPlan.updated_at;

  // 3. Deactivate the plan via PUT using its business code.
  const updateBody = {
    is_active: false,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  const updatedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(updatedPlan);

  // 4. Validate that immutable identifiers are unchanged and is_active flipped.
  TestValidator.equals(
    "id must remain unchanged after deactivation",
    updatedPlan.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain unchanged after deactivation",
    updatedPlan.code,
    originalCode,
  );
  TestValidator.predicate(
    "plan should be inactive after update",
    updatedPlan.is_active === false,
  );

  // Other fields should remain identical.
  TestValidator.equals(
    "billing_period should remain unchanged",
    updatedPlan.billing_period,
    originalBillingPeriod,
  );
  TestValidator.equals(
    "currency should remain unchanged",
    updatedPlan.currency,
    originalCurrency,
  );
  TestValidator.equals(
    "price_amount should remain unchanged",
    updatedPlan.price_amount,
    originalPriceAmount,
  );
  TestValidator.equals(
    "effective_from should remain unchanged",
    updatedPlan.effective_from,
    originalEffectiveFrom,
  );
  TestValidator.equals(
    "effective_until should remain unchanged",
    updatedPlan.effective_until ?? null,
    originalEffectiveUntil,
  );

  TestValidator.notEquals(
    "updated_at should change after update",
    updatedPlan.updated_at,
    originalUpdatedAt,
  );
}
