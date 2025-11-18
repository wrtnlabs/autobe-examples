import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Verify that an authenticated admin can successfully create a seller
 * subscription plan.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. Using the admin session (Authorization header managed by SDK), call POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with a well-formed
 *    IShoppingMallSellerSubscriptionPlan.ICreate payload.
 * 3. Assert that the created plan echoes the input business fields and that
 *    system-managed fields (id, created_at, updated_at, deleted_at) are
 *    populated or null according to the contract.
 */
export async function test_api_admin_creates_seller_subscription_plan_successfully(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare a seller subscription plan creation payload
  const effectiveFrom: string = new Date().toISOString();

  const planCreateBody = {
    code: `BASIC-${RandomGenerator.alphaNumeric(6)}`,
    name: `Basic Seller Plan ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "MONTHLY",
    currency: "USD",
    price_amount: 49.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(createdPlan);

  // 3. Validate echo of business fields
  TestValidator.equals(
    "created plan code should match request",
    createdPlan.code,
    planCreateBody.code,
  );
  TestValidator.equals(
    "created plan name should match request",
    createdPlan.name,
    planCreateBody.name,
  );
  TestValidator.equals(
    "created plan description should match request",
    createdPlan.description ?? null,
    planCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created plan billing_period should match request",
    createdPlan.billing_period,
    planCreateBody.billing_period,
  );
  TestValidator.equals(
    "created plan currency should match request",
    createdPlan.currency,
    planCreateBody.currency,
  );
  TestValidator.equals(
    "created plan price_amount should match request",
    createdPlan.price_amount,
    planCreateBody.price_amount,
  );
  TestValidator.equals(
    "created plan is_active should match request",
    createdPlan.is_active,
    planCreateBody.is_active,
  );
  TestValidator.equals(
    "created plan effective_from should match request",
    createdPlan.effective_from,
    planCreateBody.effective_from,
  );
  TestValidator.equals(
    "created plan effective_until should match request",
    createdPlan.effective_until ?? null,
    planCreateBody.effective_until ?? null,
  );

  // 4. Basic sanity checks on system-managed fields
  TestValidator.predicate(
    "created plan id should be a non-empty string",
    typeof createdPlan.id === "string" && createdPlan.id.length > 0,
  );
  TestValidator.predicate(
    "created plan created_at should be a non-empty string",
    typeof createdPlan.created_at === "string" &&
      createdPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "created plan updated_at should be a non-empty string",
    typeof createdPlan.updated_at === "string" &&
      createdPlan.updated_at.length > 0,
  );
  TestValidator.equals(
    "created plan deleted_at should be null",
    createdPlan.deleted_at ?? null,
    null,
  );
}
