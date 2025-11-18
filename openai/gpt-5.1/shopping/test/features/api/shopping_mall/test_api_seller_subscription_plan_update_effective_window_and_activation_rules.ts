import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_seller_subscription_plan_update_effective_window_and_activation_rules(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated admin context
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

  // 2. Create a baseline seller subscription plan with an open-ended window
  const planCodeBase = RandomGenerator.alphaNumeric(8);
  const planCode = `${planCodeBase}-${Date.now()}`;

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // effective_from: a date-time in the recent past (e.g., 2 days ago)
  const effectiveFromPastDate = new Date(now.getTime() - 2 * dayMs);
  const effectiveFromPast = effectiveFromPastDate.toISOString();

  const createBody = {
    code: planCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    billing_period: RandomGenerator.pick(["monthly", "yearly"] as const),
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: effectiveFromPast,
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

  // 3. Update the plan to a new future window while keeping it active
  const tomorrowDate = new Date(now.getTime() + dayMs);
  const nextYearDate = new Date(tomorrowDate.getTime() + 365 * dayMs);

  const newEffectiveFrom = tomorrowDate.toISOString();
  const newEffectiveUntil = nextYearDate.toISOString();

  const updateBody = {
    effective_from: newEffectiveFrom,
    effective_until: newEffectiveUntil,
    is_active: true,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  const updatedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: updateBody,
      },
    );
  typia.assert(updatedPlan);

  // 4. Validate that immutable business identifiers remain unchanged
  TestValidator.equals(
    "plan code must remain unchanged after update",
    updatedPlan.code,
    createdPlan.code,
  );
  TestValidator.equals(
    "plan id must remain unchanged after update",
    updatedPlan.id,
    createdPlan.id,
  );
  TestValidator.equals(
    "currency must remain unchanged when not updated",
    updatedPlan.currency,
    createdPlan.currency,
  );
  TestValidator.equals(
    "billing_period must remain unchanged when not updated",
    updatedPlan.billing_period,
    createdPlan.billing_period,
  );

  // 5. Validate that the effective window and activation flag conceptually match the update request
  // Compare timestamps instead of raw tagged strings to avoid tag-type mismatches.
  const updatedFromTime = new Date(updatedPlan.effective_from).getTime();
  const requestedFromTime = new Date(newEffectiveFrom).getTime();

  TestValidator.equals(
    "effective_from timestamp must match the requested future timestamp",
    updatedFromTime,
    requestedFromTime,
  );

  const updatedUntilRaw = updatedPlan.effective_until;

  TestValidator.predicate(
    "effective_until should not be null after update when explicitly set",
    updatedUntilRaw !== null && updatedUntilRaw !== undefined,
  );

  if (updatedUntilRaw !== null && updatedUntilRaw !== undefined) {
    const updatedUntilTime = new Date(updatedUntilRaw).getTime();
    const requestedUntilTime = new Date(newEffectiveUntil).getTime();

    TestValidator.equals(
      "effective_until timestamp must match the requested later timestamp",
      updatedUntilTime,
      requestedUntilTime,
    );

    // 6. Validate chronological consistency: effective_from < effective_until
    TestValidator.predicate(
      "effective_from must be strictly earlier than effective_until",
      updatedFromTime < updatedUntilTime,
    );
  }

  TestValidator.equals(
    "is_active should remain true after update",
    updatedPlan.is_active,
    true,
  );
}
