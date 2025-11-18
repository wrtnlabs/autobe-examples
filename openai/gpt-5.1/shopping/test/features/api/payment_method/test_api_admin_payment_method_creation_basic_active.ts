import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate basic creation of an active payment method configuration by an
 * admin.
 *
 * Business context: Admins manage which payment rails are available in
 * checkout. Creating a new payment method should only be allowed for
 * authenticated administrators and must persist a configuration record that
 * respects the schema defined by IShoppingMallPaymentMethod and
 * IShoppingMallPaymentMethod.ICreate.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate an admin using POST /auth/admin/join.
 *
 *    - Build a realistic IShoppingMallAdminJoin.ICreate payload using typia random
 *         helpers for email, password, and href/referrer URLs.
 *    - Call api.functional.auth.admin.join(connection, { body }) and typia.assert
 *         the IShoppingMallAdmin.IAuthorized response.
 *    - Rely on the SDK to attach the admin JWT to connection.headers.
 * 2. As the authenticated admin, create a new payment method using POST
 *    /shoppingMall/admin/paymentMethods.
 *
 *    - Construct an IShoppingMallPaymentMethod.ICreate body with:
 *
 *         - Code: a unique business identifier string (e.g., "card_standard_visa") built
 *                   from random pieces so it is very unlikely to collide.
 *         - Display_name: a human-readable label like "Credit Card (VISA Standard)".
 *         - Description: a short RandomGenerator.paragraph description.
 *         - Provider_type: a descriptive string such as "card_processor".
 *         - Allowed_currencies: a comma-separated list such as "KRW,USD".
 *         - Allowed_countries: a comma-separated list such as "KR,US".
 *         - Min_amount: some positive number (e.g., 10000).
 *         - Max_amount: a larger positive number (e.g., 1000000).
 *         - Status: literal "active" to ensure the method is enabled.
 *    - Call api.functional.shoppingMall.admin.paymentMethods.create with the body
 *         and typia.assert the IShoppingMallPaymentMethod response.
 * 3. Validate response consistency and required fields.
 *
 *    - Using TestValidator:
 *
 *         - Check that response.code, display_name, provider_type, status,
 *                   allowed_currencies, allowed_countries, min_amount,
 *                   max_amount match the values from the request body.
 *         - Check that id is a non-empty string and created_at/updated_at are present
 *                   (typia.assert already validates the format, so only
 *                   existence/non-emptiness is asserted via simple predicates
 *                   if needed).
 *    - This confirms the record is mapped and persisted correctly.
 *
 * Notes / constraints:
 *
 * - Do not attempt to test unauthenticated access by manipulating
 *   connection.headers directly, as header handling is owned by the SDK.
 * - Do not add any import statements beyond the template; use only
 *   RandomGenerator, TestValidator, and typia as provided.
 * - Do not write any type-error-based tests (no wrong DTO shapes or as any).
 */
export async function test_api_admin_payment_method_creation_basic_active(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin via /auth/admin/join
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a unique, active payment method as this admin
  const uniqueSuffix = RandomGenerator.alphaNumeric(12);
  const paymentCode = `card_standard_visa_${uniqueSuffix}`;

  const createBody = {
    code: paymentCode,
    display_name: `Credit Card (VISA Standard ${uniqueSuffix})`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 10000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Validate response consistency
  TestValidator.equals(
    "payment method code matches request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "display_name matches request",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "provider_type matches request",
    created.provider_type,
    createBody.provider_type,
  );
  TestValidator.equals(
    "status matches request",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "allowed_currencies matches request",
    created.allowed_currencies,
    createBody.allowed_currencies,
  );
  TestValidator.equals(
    "allowed_countries matches request",
    created.allowed_countries,
    createBody.allowed_countries,
  );
  TestValidator.equals(
    "min_amount matches request",
    created.min_amount,
    createBody.min_amount,
  );
  TestValidator.equals(
    "max_amount matches request",
    created.max_amount,
    createBody.max_amount,
  );

  TestValidator.predicate(
    "created payment method has a non-empty id",
    created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is present",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    created.updated_at.length > 0,
  );
}
