import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can create a payment method that is
 * initially inactive and scheduled for future activation.
 *
 * Business intent:
 *
 * - Platform admins must be able to pre-stage payment methods ahead of time
 *   without immediately exposing them in customer checkout.
 * - This is modeled by `is_active = false` and/or a `starts_at` value that lies
 *   in the future.
 *
 * Scenario steps:
 *
 * 1. Join as a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - This also establishes the Authorization header for subsequent admin-scoped
 *         calls.
 * 2. As that admin, call POST /shoppingMall/platformAdmin/paymentMethods with a
 *    body that:
 *
 *    - Defines basic method properties (code, display_name, provider_key,
 *         method_type, priority, optional currency/amount limits), and
 *    - Sets `is_active` to false
 *    - Sets `starts_at` to a future ISO date-time
 *    - Optionally sets `ends_at` to a later future ISO date-time.
 * 3. Assert that the response is a valid IShoppingMallPaymentMethod and that
 *    persisted fields match the requested configuration where appropriate.
 * 4. Assert that `deleted_at` is null, and if creator/updater admin summaries are
 *    present, they reference the same admin that performed the join.
 * 5. Document (in this test description) that such a configuration should mean the
 *    payment method will not appear in customer-facing checkout flows until
 *    both `is_active` is true and the current time falls within the [starts_at,
 *    ends_at] window, even though this test does not exercise customer APIs
 *    directly.
 */
export async function test_api_payment_method_creation_inactive_and_future_dated(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  const adminId = admin.id;

  // Capture a baseline "now" for relative time comparisons.
  const now = new Date();

  // 2. Prepare a payment method creation payload with inactive/future-dated settings.
  const futureStart = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1 hour
  const futureEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours

  const createBody = {
    code: `pm_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: `provider_${RandomGenerator.alphaNumeric(6)}`,
    method_type: RandomGenerator.pick([
      "card",
      "bank",
      "wallet",
      "offline",
    ] as const),
    currency_restriction: "KRW",
    min_amount: 1000,
    max_amount: 1000000,
    priority: 10,
    is_active: false,
    starts_at: futureStart,
    ends_at: futureEnd,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 3. Basic structural and identity assertions.
  TestValidator.predicate(
    "payment method id should be a non-empty UUID string",
    () => typeof created.id === "string" && created.id.length > 0,
  );

  // 4. Assert that key fields are persisted as requested.
  TestValidator.equals(
    "code must match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "display_name must match request",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "description must match request (including null semantics)",
    created.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "provider_key must match request",
    created.provider_key,
    createBody.provider_key,
  );
  TestValidator.equals(
    "method_type must match request",
    created.method_type,
    createBody.method_type,
  );
  TestValidator.equals(
    "currency_restriction must match request (null-safe)",
    created.currency_restriction ?? null,
    createBody.currency_restriction ?? null,
  );
  TestValidator.equals(
    "min_amount must match request (null-safe)",
    created.min_amount ?? null,
    createBody.min_amount ?? null,
  );
  TestValidator.equals(
    "max_amount must match request (null-safe)",
    created.max_amount ?? null,
    createBody.max_amount ?? null,
  );
  TestValidator.equals(
    "priority must match request",
    created.priority,
    createBody.priority,
  );
  TestValidator.equals(
    "is_active must be false as requested",
    created.is_active,
    createBody.is_active,
  );
  TestValidator.equals(
    "starts_at must match requested future date-time",
    created.starts_at ?? null,
    createBody.starts_at ?? null,
  );
  TestValidator.equals(
    "ends_at must match requested future date-time (or null)",
    created.ends_at ?? null,
    createBody.ends_at ?? null,
  );

  // 5. Business semantics: starts_at should be in the future relative to now.
  const parsedStartsAt = created.starts_at ? new Date(created.starts_at) : null;
  TestValidator.predicate(
    "starts_at should not be null",
    () => parsedStartsAt !== null,
  );
  if (parsedStartsAt !== null) {
    TestValidator.predicate(
      "starts_at should be strictly after the baseline 'now' captured in test",
      () => parsedStartsAt.getTime() > now.getTime(),
    );
  }

  // 6. Lifecycle expectations: deleted_at should be null for a fresh record.
  TestValidator.equals(
    "deleted_at must be null on newly created payment method",
    created.deleted_at ?? null,
    null,
  );

  // 7. If creator/updater summaries are present, they should reference the same admin.
  if (created.created_by_admin !== undefined) {
    typia.assert<IShoppingMallPlatformAdmin.ISummary>(created.created_by_admin);
    TestValidator.equals(
      "created_by_admin.id should match the platform admin who created the payment method",
      created.created_by_admin.id,
      adminId,
    );
  }
  if (created.updated_by_admin !== undefined) {
    typia.assert<IShoppingMallPlatformAdmin.ISummary>(created.updated_by_admin);
    TestValidator.equals(
      "updated_by_admin.id should match the platform admin who created the payment method",
      created.updated_by_admin.id,
      adminId,
    );
  }

  // Note: We do not call any customer-facing checkout APIs here. The business
  // expectation is that with `is_active = false` and a future `starts_at`,
  // this payment method would remain hidden from customer payment options
  // until administrators later enable it and the temporal window is satisfied.
}
