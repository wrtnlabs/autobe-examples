import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_create_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register a new admin and obtain an authorized context.
   *
   *    - Use api.functional.auth.admin.join with IShoppingMallAdminJoin.ICreate.
   *    - Rely on SDK behavior to set connection.headers.Authorization with the
   *         access token.
   * 2. Call POST /shoppingMall/admin/paymentMethods with a valid
   *    IShoppingMallPaymentMethod.ICreate payload.
   *
   *    - Provide realistic values for: code, display_name, description,
   *         provider_type, allowed_currencies, allowed_countries, min_amount,
   *         max_amount, status.
   * 3. Validate the response:
   *
   *    - Use typia.assert<IShoppingMallPaymentMethod>(output) for structural/type
   *         validation.
   *    - Use TestValidator to assert that fields echo the request payload where
   *         appropriate and that id/created_at/updated_at are properly
   *         populated.
   */

  // 1. Admin join (registration + implicit login)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "Admin_pw1!", // any string is fine; backend enforces strength rules
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a well-formed payment method creation payload
  const paymentMethodCreateBody = {
    code: `card_gateway_${RandomGenerator.alphabets(4)}`,
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // 3. Create the payment method via admin API
  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });

  // Type-level validation of the response structure
  typia.assert<IShoppingMallPaymentMethod>(created);

  // 4. Business-level consistency assertions
  // 4-1. ID should be a non-empty UUID (typia has already validated the format,
  //      so just check non-empty string semantics).
  TestValidator.predicate(
    "payment method id should be non-empty",
    created.id.length > 0,
  );

  // 4-2. created_at and updated_at should be present (non-empty),
  //      typia already validated date-time format.
  TestValidator.predicate(
    "created_at should be non-empty",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty",
    created.updated_at.length > 0,
  );

  // 4-3. Echo/consistency checks between request and response fields.
  TestValidator.equals(
    "payment method code should echo request payload",
    created.code,
    paymentMethodCreateBody.code,
  );
  TestValidator.equals(
    "display_name should echo request payload",
    created.display_name,
    paymentMethodCreateBody.display_name,
  );
  TestValidator.equals(
    "description should echo request payload (including nullability)",
    created.description ?? null,
    paymentMethodCreateBody.description ?? null,
  );
  TestValidator.equals(
    "provider_type should echo request payload",
    created.provider_type,
    paymentMethodCreateBody.provider_type,
  );
  TestValidator.equals(
    "allowed_currencies should echo request payload including nullability",
    created.allowed_currencies ?? null,
    paymentMethodCreateBody.allowed_currencies ?? null,
  );
  TestValidator.equals(
    "allowed_countries should echo request payload including nullability",
    created.allowed_countries ?? null,
    paymentMethodCreateBody.allowed_countries ?? null,
  );
  TestValidator.equals(
    "min_amount should echo request payload including nullability",
    created.min_amount ?? null,
    paymentMethodCreateBody.min_amount ?? null,
  );
  TestValidator.equals(
    "max_amount should echo request payload including nullability",
    created.max_amount ?? null,
    paymentMethodCreateBody.max_amount ?? null,
  );
  TestValidator.equals(
    "status should echo request payload",
    created.status,
    paymentMethodCreateBody.status,
  );

  // 4-4. created_at and updated_at should be consistent on initial creation.
  TestValidator.equals(
    "created_at and updated_at should be consistent on initial creation",
    created.updated_at,
    created.created_at,
  );
}
