import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that an admin can create an inactive seller subscription plan whose
 * effectiveness window is scheduled entirely in the future.
 *
 * Business purpose: Administrators must be able to preconfigure subscription
 * plans that are not yet active but will become effective at a future date,
 * allowing coordinated rollouts and marketing campaigns. This test asserts that
 * such a plan can be created with is_active = false and a future
 * effective_from/effective_until window, and that all fields (including audit
 * timestamps) are persisted and returned correctly.
 *
 * Steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. As the admin, call POST /shoppingMall/admin/sellerSubscriptionPlans with an
 *    IShoppingMallSellerSubscriptionPlan.ICreate payload that:
 *
 *    - Uses a unique business code, name, and description
 *    - Is billed YEARLY in USD for a positive price_amount
 *    - Sets is_active to false
 *    - Sets effective_from to a timestamp ~7 days in the future
 *    - Sets effective_until to a later future timestamp
 * 3. Verify that the response is a valid IShoppingMallSellerSubscriptionPlan and
 *    that:
 *
 *    - Code, name, description, billing_period, currency, price_amount, is_active
 *         match the request
 *    - Effective_from and effective_until equal the requested values
 *    - Created_at and updated_at are present and well-formed
 *    - Deleted_at is null or undefined (not a non-null string)
 * 4. Assert key business invariants using TestValidator.
 */
export async function test_api_admin_creates_inactive_future_seller_subscription_plan(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish admin authentication context.
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

  // 2. Prepare a future-effective, inactive seller subscription plan payload.
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const effectiveFromDate = new Date(now.getTime() + sevenDaysMs);
  const effectiveUntilDate = new Date(
    effectiveFromDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  const effective_from: string & tags.Format<"date-time"> =
    effectiveFromDate.toISOString() as string & tags.Format<"date-time">;
  const effective_until: string & tags.Format<"date-time"> =
    effectiveUntilDate.toISOString() as string & tags.Format<"date-time">;

  const planCodeSuffix = RandomGenerator.alphaNumeric(8);
  const code = `FUTURE-PLAN-${planCodeSuffix}`;

  const createBody = {
    code,
    name: `Future Seller Plan ${planCodeSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    billing_period: "YEARLY",
    currency: "USD",
    price_amount: 1999,
    is_active: false,
    effective_from,
    effective_until,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPlan);

  // 3. Validate business fields match the request payload.
  TestValidator.equals(
    "subscription plan code should match request body",
    createdPlan.code,
    createBody.code,
  );
  TestValidator.equals(
    "subscription plan name should match request body",
    createdPlan.name,
    createBody.name,
  );
  TestValidator.equals(
    "subscription plan description should match request body",
    createdPlan.description,
    createBody.description,
  );
  TestValidator.equals(
    "subscription plan billing_period should match request body",
    createdPlan.billing_period,
    createBody.billing_period,
  );
  TestValidator.equals(
    "subscription plan currency should match request body",
    createdPlan.currency,
    createBody.currency,
  );
  TestValidator.equals(
    "subscription plan price_amount should match request body",
    createdPlan.price_amount,
    createBody.price_amount,
  );

  // 4. Validate inactive flag and effectiveness window.
  TestValidator.predicate(
    "subscription plan is_active flag must be false on creation",
    createdPlan.is_active === false,
  );
  TestValidator.equals(
    "subscription plan effective_from must equal requested future timestamp",
    createdPlan.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "subscription plan effective_until must equal requested future timestamp",
    createdPlan.effective_until,
    createBody.effective_until,
  );

  // 5. Validate audit timestamps and soft-deletion state.
  TestValidator.predicate(
    "subscription plan created_at must be a non-empty date-time string",
    typeof createdPlan.created_at === "string" &&
      createdPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription plan updated_at must be a non-empty date-time string",
    typeof createdPlan.updated_at === "string" &&
      createdPlan.updated_at.length > 0,
  );

  TestValidator.predicate(
    "subscription plan deleted_at must be null or undefined on creation",
    createdPlan.deleted_at === null || createdPlan.deleted_at === undefined,
  );
}
