import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that banning a non-existent customer returns a 404 Not Found response.
 *
 * Validates the first implementation step of the customer ban endpoint: the
 * system must locate the customer record before proceeding to check ban status
 * or apply the ban. When an administrator provides a UUID that does not
 * correspond to any existing customer account, the endpoint must reject the
 * request with a 404 status.
 *
 * 1. Administrator authenticates via the admin join endpoint.
 * 2. A random valid-format UUID is generated that does not correspond to any
 *    existing customer.
 * 3. The administrator calls the ban endpoint with the non-existent customer ID.
 * 4. Validates that the system returns a 404 Not Found error, confirming the
 *    lookup step correctly distinguishes between existing and non-existent
 *    customer IDs.
 */
export async function test_api_customer_ban_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random UUID for a non-existent customer
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to ban the non-existent customer, expecting 404
  await TestValidator.httpError(
    "ban non-existent customer returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
        customerId: nonExistentCustomerId,
      });
    },
  );
}
