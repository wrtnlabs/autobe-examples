import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate creation of a fully configured payment method by a platform admin.
 *
 * Business goal
 *
 * - Ensure a platform administrator can register a payment method with all
 *   configuration knobs populated, including optional amount limits and
 *   availability window.
 * - Verify that authenticated admin context is established via the join API and
 *   that the created payment method is attributed to that admin.
 *
 * Flow
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use IShoppingMallPlatformAdminJoin.IRequest.
 *    - Provide realistic email, name, password, href, referrer.
 *    - Rely on SDK to inject access token into connection headers.
 * 2. Build a rich IShoppingMallPaymentMethod.ICreate payload:
 *
 *    - Code: unique string (e.g., based on RandomGenerator.alphaNumeric).
 *    - Display_name: human-readable RandomGenerator.name().
 *    - Description: RandomGenerator.paragraph() to simulate long text.
 *    - Provider_key: some gateway key string.
 *    - Method_type: a logical value such as "wallet".
 *    - Currency_restriction: a simple expression like "KRW".
 *    - Min_amount and max_amount: pick two numeric values with min <= max.
 *    - Priority: some small int32, like 10.
 *    - Is_active: true.
 *    - Starts_at: a date-time slightly in the past.
 *    - Ends_at: a date-time in the future so that now is within window.
 * 3. Call api.functional.shoppingMall.platformAdmin.paymentMethods.create with
 *    that body.
 * 4. Assert with typia.assert that the response is IShoppingMallPaymentMethod.
 * 5. Validate core field echo/invariants using TestValidator:
 *
 *    - Code, display_name, description, provider_key, method_type,
 *         currency_restriction must match the request body.
 *    - Min_amount, max_amount must match, and min_amount <= max_amount.
 *    - Priority and is_active must match.
 *    - Starts_at and ends_at must match exactly the strings sent.
 *    - Created_at and updated_at are valid ISO date-time strings (typia.assert
 *         already guarantees format) and created_at <= updated_at.
 *    - Id must be a non-empty uuid (typia.assert covers format; we only check
 *         non-empty string by predicate).
 *    - Created_by_admin and updated_by_admin, when present, must reference the
 *         joined admin by id and email, and should share its name and status.
 *
 * Notes
 *
 * - There is no GET /shoppingMall/platformAdmin/paymentMethods/{id} accessor
 *   provided, so the test only validates the immediate create response and
 *   internal consistency rather than reloading from persistence.
 */
export async function test_api_payment_method_creation_with_full_configuration(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Build a rich payment method creation payload
  const code = `wallet_promo_${RandomGenerator.alphaNumeric(8)}`;
  const displayName = "KRW Wallet Promo";
  const description = RandomGenerator.paragraph({ sentences: 8 });
  const providerKey = "wallet_gateway_profile_krw";
  const methodType = "wallet";
  const currencyRestriction = "KRW";

  // Choose min/max with a clear ordering
  const minAmount = 10000;
  const maxAmount = 500000;

  const priority: number & tags.Type<"int32"> = 10 as number &
    tags.Type<"int32">;

  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1h ago
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1h later

  const createBody = {
    code,
    display_name: displayName,
    description,
    provider_key: providerKey,
    method_type: methodType,
    currency_restriction: currencyRestriction,
    min_amount: minAmount,
    max_amount: maxAmount,
    priority,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // 3. Create payment method
  const paymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 4. Basic field echo validations
  TestValidator.equals(
    "payment method code should match input",
    paymentMethod.code,
    code,
  );
  TestValidator.equals(
    "payment method display name should match input",
    paymentMethod.display_name,
    displayName,
  );
  TestValidator.equals(
    "payment method description should match input",
    paymentMethod.description,
    description,
  );
  TestValidator.equals(
    "payment method provider_key should match input",
    paymentMethod.provider_key,
    providerKey,
  );
  TestValidator.equals(
    "payment method method_type should match input",
    paymentMethod.method_type,
    methodType,
  );
  TestValidator.equals(
    "payment method currency_restriction should match input",
    paymentMethod.currency_restriction,
    currencyRestriction,
  );

  TestValidator.equals(
    "payment method min_amount should match input",
    paymentMethod.min_amount,
    minAmount,
  );
  TestValidator.equals(
    "payment method max_amount should match input",
    paymentMethod.max_amount,
    maxAmount,
  );

  TestValidator.predicate(
    "min_amount should be less than or equal to max_amount",
    (paymentMethod.min_amount ?? 0) <= (paymentMethod.max_amount ?? 0),
  );

  TestValidator.equals(
    "payment method priority should match input",
    paymentMethod.priority,
    priority,
  );
  TestValidator.equals(
    "payment method is_active should match input",
    paymentMethod.is_active,
    true,
  );

  TestValidator.equals(
    "payment method starts_at should match input",
    paymentMethod.starts_at,
    startsAt,
  );
  TestValidator.equals(
    "payment method ends_at should match input",
    paymentMethod.ends_at,
    endsAt,
  );

  // 5. Server-generated fields sanity checks
  TestValidator.predicate(
    "payment method id must be a non-empty string",
    typeof paymentMethod.id === "string" && paymentMethod.id.length > 0,
  );

  // created_at <= updated_at logical check
  const createdAtTime = new Date(paymentMethod.created_at).getTime();
  const updatedAtTime = new Date(paymentMethod.updated_at).getTime();
  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAtTime <= updatedAtTime,
  );

  // 6. When admin summary associations are present, they should match join admin
  if (paymentMethod.created_by_admin) {
    TestValidator.equals(
      "created_by_admin.id should equal admin.id",
      paymentMethod.created_by_admin.id,
      admin.id,
    );
    TestValidator.equals(
      "created_by_admin.email should equal admin.email",
      paymentMethod.created_by_admin.email,
      admin.email,
    );
    TestValidator.equals(
      "created_by_admin.name should equal admin.displayName",
      paymentMethod.created_by_admin.name,
      admin.displayName,
    );
  }

  if (paymentMethod.updated_by_admin) {
    TestValidator.equals(
      "updated_by_admin.id should equal admin.id",
      paymentMethod.updated_by_admin.id,
      admin.id,
    );
    TestValidator.equals(
      "updated_by_admin.email should equal admin.email",
      paymentMethod.updated_by_admin.email,
      admin.email,
    );
    TestValidator.equals(
      "updated_by_admin.name should equal admin.displayName",
      paymentMethod.updated_by_admin.name,
      admin.displayName,
    );
  }
}
