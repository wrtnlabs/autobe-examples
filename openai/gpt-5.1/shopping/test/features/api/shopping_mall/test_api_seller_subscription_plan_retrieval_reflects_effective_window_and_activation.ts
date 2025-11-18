import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_seller_subscription_plan_retrieval_reflects_effective_window_and_activation(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorized context and set Authorization header.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare effective window: start of today (UTC) and +30 days.
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const effectiveFrom = startOfTodayUtc.toISOString();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const effectiveUntilDate = new Date(startOfTodayUtc.getTime() + thirtyDaysMs);
  const effectiveUntil = effectiveUntilDate.toISOString();

  // 3. Create a new seller subscription plan as admin.
  const planCodeBase = RandomGenerator.alphaNumeric(8);
  const planCode = `PLAN-${planCodeBase}`;

  const createBody = {
    code: planCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 199.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(createdPlan);

  // 4. Validate that created plan reflects the requested configuration.
  TestValidator.equals(
    "created plan code matches requested code",
    createdPlan.code,
    planCode,
  );
  TestValidator.equals(
    "created plan is_active matches requested is_active",
    createdPlan.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "created plan effective_from matches requested",
    createdPlan.effective_from,
    createBody.effective_from,
  );
  TestValidator.equals(
    "created plan effective_until matches requested",
    createdPlan.effective_until ?? null,
    createBody.effective_until ?? null,
  );

  // Audit fields: created_at, updated_at should be non-empty, deleted_at should be null.
  TestValidator.predicate(
    "created_at is a non-empty string",
    createdPlan.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty string",
    createdPlan.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null right after creation",
    createdPlan.deleted_at ?? null,
    null,
  );

  // 5. Call the public detail endpoint without authentication.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const fetchedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.sellerSubscriptionPlans.at(
      publicConnection,
      { planCode: createdPlan.code },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(fetchedPlan);

  // 6. Validate that fetched plan matches the created plan in key fields.
  TestValidator.equals(
    "fetched plan code matches created plan code",
    fetchedPlan.code,
    createdPlan.code,
  );
  TestValidator.equals(
    "fetched is_active matches created is_active",
    fetchedPlan.is_active,
    createdPlan.is_active,
  );
  TestValidator.equals(
    "fetched effective_from matches created effective_from",
    fetchedPlan.effective_from,
    createdPlan.effective_from,
  );
  TestValidator.equals(
    "fetched effective_until matches created effective_until",
    fetchedPlan.effective_until ?? null,
    createdPlan.effective_until ?? null,
  );
  TestValidator.equals(
    "fetched deleted_at matches created deleted_at (null for active plan)",
    fetchedPlan.deleted_at ?? null,
    createdPlan.deleted_at ?? null,
  );
}
