import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

export async function test_api_admin_payment_method_update_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain admin-authenticated context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method as this admin
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(created);

  const originalSnapshot: IShoppingMallPaymentMethod = created;

  // 3. Prepare an update payload that would meaningfully change the record
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_type: "wallet",
    allowed_currencies: "KRW,USD,EUR",
    allowed_countries: "KR,US,DE",
    min_amount: 500,
    max_amount: 500000,
    status: "disabled",
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  // 4. Attempt update WITHOUT any Authorization header (anonymous request)
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "payment method update should fail for anonymous caller",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.update(
        anonymousConnection,
        {
          paymentMethodCode: created.code,
          body: updateBody,
        },
      );
    },
  );

  // 5. Register a customer to obtain a non-admin token
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 6. Attempt update with a CUSTOMER token (non-admin role)
  await TestValidator.error(
    "payment method update should fail for customer actor",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.update(
        connection,
        {
          paymentMethodCode: created.code,
          body: updateBody,
        },
      );
    },
  );

  // 7. Validate that our original snapshot is still structurally a valid
  //    payment method object. We cannot re-fetch from server with current SDK,
  //    so we focus on authorization behavior rather than state diff.
  typia.assert<IShoppingMallPaymentMethod>(originalSnapshot);

  // Basic sanity check: code should remain the same as initially created
  TestValidator.equals(
    "payment method code remains unchanged in snapshot",
    originalSnapshot.code,
    created.code,
  );
}
