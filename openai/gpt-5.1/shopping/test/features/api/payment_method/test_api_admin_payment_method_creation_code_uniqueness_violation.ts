import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Verify that admin payment method creation enforces uniqueness on the `code`
 * field.
 *
 * Business scenario:
 *
 * - An administrator joins the platform and receives an authorization context.
 * - The admin creates a new payment method with a stable business `code`.
 * - A subsequent attempt to create another payment method with the same `code`
 *   must be rejected due to the unique index on
 *   shopping_mall_payment_methods.code.
 *
 * Steps:
 *
 * 1. Register and implicitly authenticate an admin via POST /auth/admin/join.
 * 2. Using the authenticated admin connection, create a payment method with a
 *    chosen `code` and valid configuration fields via POST
 *    /shoppingMall/admin/paymentMethods.
 * 3. Assert that the first creation succeeds, returns an
 *    IShoppingMallPaymentMethod, and its `code` matches the requested value.
 * 4. Attempt to create a second payment method with the identical `code` but
 *    different non-unique fields.
 * 5. Assert that the second creation fails using TestValidator.error, treating it
 *    as a business-level uniqueness violation (without asserting on specific
 *    HTTP status codes).
 */
export async function test_api_admin_payment_method_creation_code_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register and implicitly authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create the first payment method with a chosen unique code
  const paymentCode = "bank_transfer_main";

  const firstCreateBody = {
    code: paymentCode,
    display_name: "Bank Transfer Main",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "bank_gateway",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: firstCreateBody,
    });
  typia.assert(firstPaymentMethod);

  TestValidator.equals(
    "created payment method code should match requested code",
    firstPaymentMethod.code,
    paymentCode,
  );

  // 3. Attempt to create a second payment method with the same code
  const secondCreateBody = {
    code: paymentCode,
    display_name: "Bank Transfer Main Duplicate",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_type: "bank_gateway",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 500,
    max_amount: 500000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  await TestValidator.error(
    "duplicate payment method code creation must fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );
}
