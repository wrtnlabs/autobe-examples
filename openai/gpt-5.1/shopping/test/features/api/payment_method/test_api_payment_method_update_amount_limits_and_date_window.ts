import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate updating amount limits and availability window on a payment method.
 *
 * Scenario:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join.
 * 2. As that admin, create a payment method with baseline min/max amounts and
 *    starts_at/ends_at window.
 * 3. Update the payment method via PUT
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId} to change
 *    min_amount/max_amount and adjust starts_at/ends_at (including setting
 *    ends_at to null).
 * 4. Assert that the returned configuration reflects the new limits and window and
 *    that updated_at has changed.
 */
export async function test_api_payment_method_update_amount_limits_and_date_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as platform admin to obtain authorized session and token
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline payment method configuration
  const baselineMinAmount = 1000;
  const baselineMaxAmount = 500000;

  const now = new Date();
  const baselineStartsAt = new Date(
    now.getTime() - 60 * 60 * 1000,
  ).toISOString(); // 1h in past
  const baselineEndsAt = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // +1 day

  const createBody = {
    code: `pm_${RandomGenerator.alphaNumeric(12)}`,
    display_name: `Payment ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: `provider_${RandomGenerator.alphaNumeric(6)}`,
    method_type: RandomGenerator.pick([
      "card",
      "bank",
      "wallet",
      "offline",
    ] as const),
    currency_restriction: null,
    min_amount: baselineMinAmount,
    max_amount: baselineMaxAmount,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: baselineStartsAt,
    ends_at: baselineEndsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Sanity checks on created record
  TestValidator.equals(
    "created id should be stable UUID",
    created.id,
    created.id,
  );
  TestValidator.equals(
    "created code matches input",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created min_amount matches",
    created.min_amount,
    baselineMinAmount,
  );
  TestValidator.equals(
    "created max_amount matches",
    created.max_amount,
    baselineMaxAmount,
  );
  TestValidator.equals(
    "created starts_at matches",
    created.starts_at,
    baselineStartsAt,
  );
  TestValidator.equals(
    "created ends_at matches",
    created.ends_at,
    baselineEndsAt,
  );

  const originalUpdatedAt = created.updated_at;

  // 3. First update: tighten limits and move window + clear ends_at
  const updatedMinAmount = baselineMinAmount + 500; // 1500
  const updatedMaxAmount = baselineMaxAmount - 100000; // 400000

  const updatedStartsAt = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString(); // +1h in future
  const updatedEndsAt: (string & tags.Format<"date-time">) | null = null;

  const updateBody1 = {
    min_amount: updatedMinAmount,
    max_amount: updatedMaxAmount,
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody1,
      },
    );
  typia.assert(updated1);

  // 4. Assert that updated config reflects new limits and window
  TestValidator.equals(
    "updated1 min_amount should match requested value",
    updated1.min_amount,
    updatedMinAmount,
  );
  TestValidator.equals(
    "updated1 max_amount should match requested value",
    updated1.max_amount,
    updatedMaxAmount,
  );
  TestValidator.equals(
    "updated1 starts_at should match requested value",
    updated1.starts_at,
    updatedStartsAt,
  );
  TestValidator.equals(
    "updated1 ends_at should be null after clearing",
    updated1.ends_at,
    updatedEndsAt,
  );

  TestValidator.notEquals(
    "updated_at must change after first update",
    updated1.updated_at,
    originalUpdatedAt,
  );

  // 5. Second update: clear amount limits to null while keeping window
  const updateBody2 = {
    min_amount: null,
    max_amount: null,
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody2,
      },
    );
  typia.assert(updated2);

  TestValidator.equals(
    "updated2 min_amount should be null",
    updated2.min_amount,
    null,
  );
  TestValidator.equals(
    "updated2 max_amount should be null",
    updated2.max_amount,
    null,
  );
  TestValidator.equals(
    "updated2 starts_at should remain same as last update",
    updated2.starts_at,
    updatedStartsAt,
  );
  TestValidator.equals(
    "updated2 ends_at should remain null",
    updated2.ends_at,
    updatedEndsAt,
  );

  TestValidator.equals(
    "payment method id remains stable across updates",
    updated2.id,
    created.id,
  );
}
