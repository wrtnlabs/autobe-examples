import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_creation_code_uniqueness_conflict(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method with a unique business code
  const code = "wallet_x";

  const firstCreateBody = {
    code,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "wallet",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstCreated =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: firstCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(firstCreated);

  // Validate that persisted configuration reflects the requested payload
  TestValidator.equals(
    "created payment method code matches input",
    firstCreated.code,
    firstCreateBody.code,
  );
  TestValidator.equals(
    "created payment method display_name matches input",
    firstCreated.display_name,
    firstCreateBody.display_name,
  );
  TestValidator.equals(
    "created payment method provider_type matches input",
    firstCreated.provider_type,
    firstCreateBody.provider_type,
  );
  TestValidator.equals(
    "created payment method status matches input",
    firstCreated.status,
    firstCreateBody.status,
  );

  // 3. Attempt to create a second payment method with the same code
  const secondCreateBody = {
    code,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "wallet",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 200000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  await TestValidator.error(
    "duplicate payment method code must be rejected",
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
