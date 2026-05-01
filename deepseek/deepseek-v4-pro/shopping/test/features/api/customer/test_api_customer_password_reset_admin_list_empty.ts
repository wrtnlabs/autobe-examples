import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerPasswordReset";
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
 * Test that an administrator can retrieve the password reset token history for a
 * customer with no reset history, verifying the empty-page edge case.
 *
 * Validates that the password-resets listing endpoint handles the zero-history
 * scenario gracefully. When a customer has never initiated a password reset, the
 * endpoint must return a successful response with an empty data array and
 * records=0 rather than throwing an error. This ensures proper pagination
 * behavior for the boundary case where no records exist.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Customer registers and authenticates via customer join.
 * 3. Administrator queries the customer's password reset history with an empty
 *    request body (no filters applied).
 * 4. Validates that pagination metadata reports records=0, pages=0, and data is
 *    an empty array.
 */
export async function test_api_customer_password_reset_admin_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Query password reset history with empty body
  const result =
    await api.functional.shoppingMall.admin.customers.password_resets.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {} satisfies IShoppingMallCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate empty result
  TestValidator.equals("records count", result.pagination.records, 0);
  TestValidator.equals("pages count", result.pagination.pages, 0);
  TestValidator.predicate("data is empty", result.data.length === 0);
}
