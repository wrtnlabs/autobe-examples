import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

export async function test_api_admin_payment_method_surcharge_read_not_found_for_unknown_payment_method(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a valid payment method as baseline data
  const paymentMethodBody = {
    code: `method_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  TestValidator.equals(
    "created payment method code should match request",
    paymentMethod.code,
    paymentMethodBody.code,
  );

  // 3. Create a real surcharge for that payment method
  const surchargeBody = {
    scope_code: "default_scope",
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 1000000,
    fixed_fee_amount: 1000,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeBody,
      },
    );
  typia.assert(surcharge);

  TestValidator.equals(
    "surcharge should be associated with created payment method",
    surcharge.paymentMethod.code,
    paymentMethod.code,
  );

  // 4. Construct a bogus payment method code that does not exist
  const bogusPaymentMethodCode = `non_existing_method_code_${RandomGenerator.alphaNumeric(8)}`;

  TestValidator.notEquals(
    "bogus payment method code must differ from real code",
    bogusPaymentMethodCode,
    paymentMethod.code,
  );

  // 5. Attempt to read surcharge with bogus payment method code and expect failure
  await TestValidator.error(
    "reading surcharge with unknown payment method code should fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
        connection,
        {
          paymentMethodCode: bogusPaymentMethodCode,
          surchargeId: surcharge.id,
        },
      );
    },
  );
}
