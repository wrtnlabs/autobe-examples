import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate minimal creation of an active admin payment method.
 *
 * Business goal: Ensure that a freshly joined admin can register a new payment
 * method using only the mandatory fields, and that the resulting configuration
 * is immediately active and fully materialized on the admin API.
 *
 * End-to-end steps:
 *
 * 1. Admin registration (join):
 *
 *    - Call POST /auth/admin/join via api.functional.auth.admin.join.
 *    - Use IShoppingMallAdminJoin.ICreate to provide unique email/password plus
 *         basic session context (ip, href, referrer).
 *    - Rely on the SDK to inject the returned JWT into connection headers.
 *    - Assert the returned payload as IShoppingMallAdmin.IAuthorized.
 * 2. Create payment method with minimal required fields:
 *
 *    - Define an IShoppingMallPaymentMethod.ICreate payload containing only the
 *         strictly required fields:
 *
 *         - Code: a unique business string identifier (e.g. "card_standard").
 *         - Display_name: human-friendly name (e.g. "Standard Credit Card").
 *         - Provider_type: a valid provider family label, e.g. "card_processor".
 *         - Status: set to "active" so that the method is usable immediately. All
 *                   nullable/optional fields (description, allowed_currencies,
 *                   allowed_countries, min_amount, max_amount) are omitted so
 *                   that the backend populates them as null or leaves them
 *                   undefined according to schema.
 *    - Call api.functional.shoppingMall.admin.paymentMethods.create with the above
 *         body while the connection carries the admin Authorization header from
 *         step 1.
 * 3. Validate response structure and echo behavior:
 *
 *    - Assert the response type with typia.assert<IShoppingMallPaymentMethod>().
 *    - Using TestValidator:
 *
 *         - Verify that code, display_name, provider_type, and status match the request
 *                   payload exactly (string equality checks).
 *         - Ensure status is "active".
 *         - Rely on typia.assert for id, created_at, updated_at, and nullable field type
 *                   correctness without additional manual type checks.
 * 4. Business-level expectations (no further API calls needed):
 *
 *    - The test does not need to verify retrieval by another endpoint, but it should
 *         document that a follow-up GET
 *         /shoppingMall/admin/paymentMethods/{paymentMethodCode} could use the
 *         same code value to locate this configuration.
 *    - Primary focus is verifying minimal, immediately active creation and correct
 *         echo of core identifying fields.
 */
export async function test_api_admin_payment_method_creation_minimal_active(
  connection: api.IConnection,
) {
  // 1. Admin registration (join)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create payment method with minimal required fields
  const code = "card_standard";
  const displayName = "Standard Credit Card";
  const providerType = "card_processor";
  const status = "active";

  const createBody = {
    code,
    display_name: displayName,
    provider_type: providerType,
    status,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });

  // 3. Validate response structure and echo behavior
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // Core field echoes and business-level expectations
  TestValidator.equals(
    "payment method code should match request",
    paymentMethod.code,
    code,
  );
  TestValidator.equals(
    "payment method display_name should match request",
    paymentMethod.display_name,
    displayName,
  );
  TestValidator.equals(
    "payment method provider_type should match request",
    paymentMethod.provider_type,
    providerType,
  );
  TestValidator.equals(
    "payment method status should be active",
    paymentMethod.status,
    status,
  );
}
