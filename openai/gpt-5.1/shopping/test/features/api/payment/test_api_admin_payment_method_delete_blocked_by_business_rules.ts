import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that deletion of a payment method is blocked by business rules.
 *
 * Business intent:
 *
 * - Administrative payment method configurations represent core payment rails
 *   (e.g., card, bank transfer, wallet) that may be referenced by historical or
 *   active payments.
 * - The platform may enforce rules preventing deletion of such methods once they
 *   are in use, to respect referential integrity and compliance.
 *
 * Due to limited public APIs in this test harness (no order/payment creation
 * endpoints), we cannot actually create downstream payment records that
 * reference the method. Instead, this test prepares the environment and
 * exercises the DELETE endpoint in a way that is ready to assert on business
 * rule violations once the backend enforces them.
 *
 * Scenario:
 *
 * 1. Join as an admin using POST /auth/admin/join to establish an admin session
 *    and authorization.
 * 2. Create a payment method via POST /shoppingMall/admin/paymentMethods using a
 *    realistic IShoppingMallPaymentMethod.ICreate payload.
 * 3. Attempt to delete the payment method by its business code via DELETE
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}.
 * 4. Expect the deletion call to fail (throw) under business rules that protect
 *    payment methods that may be in use. The test uses TestValidator.error to
 *    assert that an error is thrown by the erase call.
 */
export async function test_api_admin_payment_method_delete_blocked_by_business_rules(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorization.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a payment method with a stable business code.
  const paymentMethodCode: string = RandomGenerator.alphaNumeric(12);
  const createBody = {
    code: paymentMethodCode,
    display_name: "Test Payment Method",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Sanity check: ensure the created payment method has the same business code.
  TestValidator.equals(
    "created payment method code matches requested code",
    created.code,
    paymentMethodCode,
  );

  // 3 & 4. Attempt to delete the payment method and expect business rules
  // to block deletion (i.e., erase should throw an error in this scenario).
  await TestValidator.error(
    "deletion of payment method is blocked by business rules",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
        paymentMethodCode,
      });
    },
  );
}
