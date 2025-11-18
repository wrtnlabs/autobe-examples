import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_delete_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin so that subsequent calls are authorized.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method configuration to be deleted.
  const paymentMethodCode = `delete_test_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    code: paymentMethodCode,
    display_name: "Delete Test Payment Method",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(createdPaymentMethod);

  TestValidator.equals(
    "created payment method code matches request body",
    createdPaymentMethod.code,
    paymentMethodCode,
  );

  // 3. Delete the payment method by its business code.
  await api.functional.shoppingMall.admin.paymentMethods.erase(connection, {
    paymentMethodCode,
  });

  // 4. Since we do not have a GET or search endpoint in the provided SDK for
  //    re-checking, successful completion of erase without throwing is treated
  //    as success. Add a simple predicate assertion to make the test intention explicit.
  TestValidator.predicate("erase operation completed without throwing", true);
}
