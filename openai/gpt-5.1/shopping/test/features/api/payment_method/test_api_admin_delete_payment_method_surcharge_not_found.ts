import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodSurcharge";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

export async function test_api_admin_delete_payment_method_surcharge_not_found(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method with a deterministic random code
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  const paymentMethodCode: string = paymentMethod.code;

  // 3. Create a valid surcharge under this payment method
  const surchargeCreateBody = {
    scope_code: undefined,
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 500_000,
    fixed_fee_amount: 1_000,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const existingSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: surchargeCreateBody,
      },
    );
  typia.assert(existingSurcharge);

  // 4. Generate a non-existing surcharge UUID that differs from the existing one
  let nonExistingSurchargeId: string & tags.Format<"uuid">;
  while (true) {
    const candidate = typia.random<string & tags.Format<"uuid">>();
    if (candidate !== existingSurcharge.id) {
      nonExistingSurchargeId = candidate;
      break;
    }
  }

  // 5. Attempt to delete the non-existing surcharge and expect an error
  await TestValidator.error(
    "delete non-existing surcharge should fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
        connection,
        {
          paymentMethodCode,
          surchargeId: nonExistingSurchargeId,
        },
      );
    },
  );

  // 6. Verify existing surcharge remains intact via index search
  const listRequestBody = {
    page: 0,
    limit: 10,
    search: undefined,
    minOrderAmount: undefined,
    maxOrderAmount: undefined,
    currencyCode: undefined,
    scopeCode: undefined,
    isPlatformRevenue: undefined,
    refundablePolicy: undefined,
    sortBy: undefined,
    sortDirection: undefined,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const pageResult: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: listRequestBody,
      },
    );
  typia.assert(pageResult);

  const stillExists = pageResult.data.some(
    (row) => row.id === existingSurcharge.id,
  );
  TestValidator.predicate(
    "existing surcharge must remain after not-found delete attempt",
    stillExists,
  );

  // 7. Repeat delete attempt with same non-existing ID to ensure consistent behavior
  await TestValidator.error(
    "repeated delete of non-existing surcharge should fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
        connection,
        {
          paymentMethodCode,
          surchargeId: nonExistingSurchargeId,
        },
      );
    },
  );
}
