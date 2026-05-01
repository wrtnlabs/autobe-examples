import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test cross-customer scoping enforcement for password reset record retrieval.
 *
 * Validates that an administrator cannot retrieve a password reset record using
 * a customerId that does not own the reset token. Even though a reset record may
 * exist in the database for another customer, the system must return a 404 error
 * to prevent information leakage about other customers' password reset activities.
 *
 * This test verifies the cross-customer scoping rule: password reset records are
 * strictly scoped to their owning customer, and attempting to access them through
 * a different customer's ID must fail with a 404 response regardless of whether
 * the reset record exists under another customer.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Customer A registers via authorize_customer_join.
 * 3. Customer B registers via authorize_customer_join.
 * 4. Administrator attempts to retrieve a password reset using Customer B's ID
 *    with a random non-existent resetId.
 * 5. Validates that the system returns a 404 HTTP error, confirming cross-customer
 *    scoping protection.
 */
export async function test_api_admin_customer_password_reset_cross_customer_scoping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 3. Create Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 4. Attempt to retrieve a password reset using Customer B's ID
  //    with a random resetId — the system must return 404
  await TestValidator.httpError(
    "cross-customer scoping prevents password reset retrieval under different customer",
    404,
    async () =>
      await api.functional.shoppingMall.admin.customers.password_resets.at(
        adminConnection,
        {
          customerId: customerB.id,
          resetId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
