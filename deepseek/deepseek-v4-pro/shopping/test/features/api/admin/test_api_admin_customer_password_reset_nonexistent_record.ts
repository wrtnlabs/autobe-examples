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
 * Test that an administrator receives a 404 error when querying a password reset
 * record with a valid customer ID but a non-existent reset ID.
 *
 * Validates the basic not-found behavior of the password reset retrieval
 * endpoint. The administrator is authenticated first, then a customer is created
 * to provide a valid customerId. A random UUID that does not correspond to any
 * existing password reset record is used as the resetId. The endpoint must reject
 * the request with an error, confirming that non-existent records are handled
 * correctly without leaking any data or revealing information about which records
 * might exist.
 *
 * 1. Administrator registers and authenticates via the admin join endpoint.
 * 2. A customer is created to obtain a valid customerId.
 * 3. The administrator queries the password reset endpoint with the valid
 *    customerId and a randomly generated, non-existent resetId.
 * 4. Validates that the request fails with an error response.
 */
export async function test_api_admin_customer_password_reset_nonexistent_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create customer to get valid customerId
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Query with valid customerId but non-existent resetId
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent password reset record returns 404",
    async () => {
      await api.functional.shoppingMall.admin.customers.password_resets.at(
        adminConnection,
        {
          customerId: customer.id,
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
