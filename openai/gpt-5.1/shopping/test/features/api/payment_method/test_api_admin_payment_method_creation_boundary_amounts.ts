import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_creation_boundary_amounts(
  connection: api.IConnection,
) {
  /**
   * Validate creation of payment methods with boundary min_amount and
   * max_amount.
   *
   * Business flow:
   *
   * 1. Register a new admin via POST /auth/admin/join to obtain an authorized
   *    admin context (SDK automatically attaches the access token to
   *    connection.headers).
   * 2. As that admin, create a payment method with min_amount=0 and
   *    max_amount=null to validate lower boundary handling and unbounded upper
   *    limit.
   * 3. Create another payment method with min_amount=10000 and max_amount=10000 to
   *    validate that configurations where min and max are equal are accepted
   *    and stored correctly.
   * 4. Assert that the returned IShoppingMallPaymentMethod entities echo the
   *    configured boundary values precisely and are created with status
   *    "active".
   */

  // 1. Join as admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create payment method with min_amount=0 and max_amount=null
  const minOnlyBody = {
    code: "boundary_min_only",
    display_name: "Boundary Min Only",
    description:
      "Payment method for boundary test: min_amount=0, max_amount=null",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: 0,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const minOnlyMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: minOnlyBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(minOnlyMethod);

  TestValidator.equals(
    "min-only payment method code matches",
    minOnlyMethod.code,
    "boundary_min_only",
  );
  TestValidator.equals(
    "min-only payment method min_amount is exactly 0",
    minOnlyMethod.min_amount,
    0,
  );
  TestValidator.equals(
    "min-only payment method max_amount is null",
    minOnlyMethod.max_amount,
    null,
  );
  TestValidator.equals(
    "min-only payment method status is active",
    minOnlyMethod.status,
    "active",
  );

  // 3. Create payment method with min_amount=max_amount=10000
  const minMaxBody = {
    code: "boundary_min_max",
    display_name: "Boundary Min Equals Max",
    description:
      "Payment method for boundary test: min_amount and max_amount both 10000",
    provider_type: "card_processor",
    allowed_currencies: null,
    allowed_countries: null,
    min_amount: 10000,
    max_amount: 10000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const minMaxMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: minMaxBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(minMaxMethod);

  TestValidator.equals(
    "min-max payment method code matches",
    minMaxMethod.code,
    "boundary_min_max",
  );
  TestValidator.equals(
    "min-max payment method min_amount is exactly 10000",
    minMaxMethod.min_amount,
    10000,
  );
  TestValidator.equals(
    "min-max payment method max_amount is exactly 10000",
    minMaxMethod.max_amount,
    10000,
  );
  TestValidator.equals(
    "min-max payment method status is active",
    minMaxMethod.status,
    "active",
  );
}
