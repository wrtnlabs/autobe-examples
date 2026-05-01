import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an admin cannot retrieve password reset history for a non-existent customer.
 *
 * Validates that the system correctly returns HTTP 404 Not Found when an administrator
 * attempts to access password reset records using a customerId that does not correspond
 * to any registered customer in the system. The non-existent UUID is randomly generated
 * and has never been associated with any account.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. A random valid UUID is generated to represent a non-existent customer.
 * 3. The administrator attempts to retrieve password reset history with the non-existent customerId.
 * 4. Validates the endpoint returns HTTP 404 Not Found.
 */
export async function test_api_customer_password_reset_admin_customer_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate random UUID for non-existent customer
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve password reset history → expect 404
  await TestValidator.httpError("customer not found returns 404", 404, () =>
    api.functional.shoppingMall.admin.customers.password_resets.index(
      adminConnection,
      {
        customerId: nonExistentCustomerId,
        body: {} satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    ),
  );
}
