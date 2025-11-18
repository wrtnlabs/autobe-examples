import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_update_nonexistent_code_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorization context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Prepare a payment method code that is guaranteed not to exist in this scenario.
  const nonexistentCode =
    "nonexistent_code_for_update_" + RandomGenerator.alphaNumeric(12);

  // 3. Build a valid update payload for IShoppingMallPaymentMethod.IUpdate.
  const updatePayload = {
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  // 4. Attempt to update the non-existent payment method code and expect an error.
  await TestValidator.error(
    "updating a non-existent payment method code must fail and not create records",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.update(
        connection,
        {
          paymentMethodCode: nonexistentCode,
          body: updatePayload,
        },
      );
    },
  );
}
