import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate that a seller subscription plan created by an admin becomes publicly
 * retrievable by its business planCode.
 *
 * Business context:
 *
 * - Admins define seller subscription plans, each identified by a stable business
 *   code (e.g., BASIC, PRO, ENTERPRISE) and commercial terms like
 *   billing_period, currency, and recurring price_amount.
 * - Public consumers (e.g., seller onboarding UI, internal catalog UI) must be
 *   able to fetch plan details by this business code without authentication.
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join to obtain an administrator
 *    authorization context.
 * 2. Using that admin context, create a seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with a valid
 *    IShoppingMallSellerSubscriptionPlan.ICreate payload.
 * 3. Capture the created plan's business code.
 * 4. From a new unauthenticated connection, call GET
 *    /shoppingMall/sellerSubscriptionPlans/{planCode} with the captured code.
 * 5. Verify that the returned plan matches the key business fields of the created
 *    plan, and that it is accessible without authentication.
 */
export async function test_api_seller_subscription_plan_public_retrieval_after_creation(
  connection: api.IConnection,
) {
  // 1. Admin joins and obtains authorized context
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
  typia.assert(adminAuthorized);

  // 2. Admin creates a seller subscription plan
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const planCodePrefix = "BASIC-PLAN-" as const;
  const planCodeSuffix = RandomGenerator.alphaNumeric(8);
  const planCode = `${planCodePrefix}${planCodeSuffix}`;

  const createBody = {
    code: planCode,
    name: "Basic Seller Plan",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "MONTHLY",
    currency: "USD",
    price_amount: 29.99,
    is_active: true,
    effective_from: nowIso,
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdPlan);

  // Basic sanity: created plan reflects requested core fields
  TestValidator.equals(
    "created plan code should equal requested code",
    createdPlan.code,
    createBody.code,
  );
  TestValidator.equals(
    "created plan name should equal requested name",
    createdPlan.name,
    createBody.name,
  );
  TestValidator.equals(
    "created plan billing_period should equal requested billing_period",
    createdPlan.billing_period,
    createBody.billing_period,
  );
  TestValidator.equals(
    "created plan currency should equal requested currency",
    createdPlan.currency,
    createBody.currency,
  );
  TestValidator.equals(
    "created plan price_amount should equal requested price_amount",
    createdPlan.price_amount,
    createBody.price_amount,
  );
  TestValidator.equals(
    "created plan is_active should equal requested is_active",
    createdPlan.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "created plan effective_from should equal requested effective_from",
    createdPlan.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "created plan effective_until should equal requested effective_until",
    createdPlan.effective_until ?? null,
    createBody.effective_until,
  );

  // We do not assert specific values of created_at/updated_at/deleted_at
  // beyond typia.assert, but we can assert deleted_at is null-ish on creation.
  TestValidator.predicate(
    "created plan deleted_at should be null or undefined right after creation",
    createdPlan.deleted_at === null || createdPlan.deleted_at === undefined,
  );

  // 3. Capture planCode
  const planCodeForPublicFetch: string = createdPlan.code;

  // 4. Public retrieval from unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const publicPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.sellerSubscriptionPlans.at(
      unauthConnection,
      {
        planCode: planCodeForPublicFetch,
      },
    );
  typia.assert(publicPlan);

  // 5. Validate that public retrieval matches core fields of created plan
  TestValidator.equals(
    "public plan code should match created plan code",
    publicPlan.code,
    createdPlan.code,
  );
  TestValidator.equals(
    "public plan name should match created plan name",
    publicPlan.name,
    createdPlan.name,
  );
  TestValidator.equals(
    "public plan billing_period should match created plan billing_period",
    publicPlan.billing_period,
    createdPlan.billing_period,
  );
  TestValidator.equals(
    "public plan currency should match created plan currency",
    publicPlan.currency,
    createdPlan.currency,
  );
  TestValidator.equals(
    "public plan price_amount should match created plan price_amount",
    publicPlan.price_amount,
    createdPlan.price_amount,
  );
  TestValidator.equals(
    "public plan is_active should match created plan is_active",
    publicPlan.is_active,
    createdPlan.is_active,
  );
  TestValidator.equals(
    "public plan effective_from should match created plan effective_from",
    publicPlan.effective_from,
    createdPlan.effective_from,
  );
  TestValidator.equals(
    "public plan effective_until should match created plan effective_until",
    publicPlan.effective_until ?? null,
    createdPlan.effective_until ?? null,
  );

  // Lifecycle timestamps should be consistent for same record
  TestValidator.equals(
    "public plan created_at should match created plan created_at",
    publicPlan.created_at,
    createdPlan.created_at,
  );
  TestValidator.equals(
    "public plan updated_at should match created plan updated_at",
    publicPlan.updated_at,
    createdPlan.updated_at,
  );
  TestValidator.equals(
    "public plan deleted_at should match created plan deleted_at",
    publicPlan.deleted_at ?? null,
    createdPlan.deleted_at ?? null,
  );

  // 6. Implicitly confirm public accessibility by successful unauthenticated fetch.
}
