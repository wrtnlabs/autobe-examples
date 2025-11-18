import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that an admin can create a payment method in a disabled state.
 *
 * Business purpose
 *
 * - Admins must be able to fully configure payment methods before exposing them
 *   to customers at checkout.
 * - Creating a method directly with status "disabled" allows configuration and
 *   review without affecting live checkout flows.
 *
 * Steps
 *
 * 1. Join as an admin using POST /auth/admin/join, which also authenticates the
 *    connection and installs the Authorization header.
 * 2. Create a payment method with POST /shoppingMall/admin/paymentMethods using an
 *    IShoppingMallPaymentMethod.ICreate payload where:
 *
 *    - Code is a unique identifier (e.g., "cod_temporarily_disabled_XXXX").
 *    - Display_name is a descriptive label including that it is disabled.
 *    - Provider_type is a concrete provider family like "cod".
 *    - Status is the string literal "disabled".
 *    - Optional descriptive fields (description / allowed_currencies /
 *         allowed_countries / min_amount / max_amount) are provided with
 *         realistic values.
 * 3. Assert that the response:
 *
 *    - Is a valid IShoppingMallPaymentMethod (via typia.assert).
 *    - Echoes the business code and configuration we sent.
 *    - Has status exactly equal to "disabled".
 *    - Has non-empty audit timestamps (created_at / updated_at) that look like valid
 *         date-time strings (implicitly validated by typia).
 */
export async function test_api_admin_payment_method_creation_with_disabled_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin via join API
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare a disabled payment method creation payload
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);

  const paymentMethodCreateBody = {
    code: `cod_temporarily_disabled_${uniqueSuffix}`,
    display_name: `Cash on Delivery (disabled ${uniqueSuffix})`,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    provider_type: "cod",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 10000,
    max_amount: 500000,
    status: "disabled",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(created);

  // 3. Validate core business behavior: disabled creation & field echoing
  TestValidator.equals(
    "created payment method code should match input code",
    created.code,
    paymentMethodCreateBody.code,
  );

  TestValidator.equals(
    "created payment method display_name should match input display_name",
    created.display_name,
    paymentMethodCreateBody.display_name,
  );

  TestValidator.equals(
    "created payment method provider_type should match input provider_type",
    created.provider_type,
    paymentMethodCreateBody.provider_type,
  );

  TestValidator.equals(
    "created payment method status should be 'disabled' as requested",
    created.status,
    "disabled",
  );

  TestValidator.equals(
    "description should be persisted as provided",
    created.description,
    paymentMethodCreateBody.description,
  );

  TestValidator.equals(
    "allowed_currencies should be persisted as provided",
    created.allowed_currencies,
    paymentMethodCreateBody.allowed_currencies,
  );

  TestValidator.equals(
    "allowed_countries should be persisted as provided",
    created.allowed_countries,
    paymentMethodCreateBody.allowed_countries,
  );

  TestValidator.equals(
    "min_amount should be persisted as provided",
    created.min_amount,
    paymentMethodCreateBody.min_amount,
  );

  TestValidator.equals(
    "max_amount should be persisted as provided",
    created.max_amount,
    paymentMethodCreateBody.max_amount,
  );

  // Audit fields are validated structurally by typia; additionally ensure
  // that created_at and updated_at are non-empty strings.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    created.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    created.updated_at.length > 0,
  );
}
