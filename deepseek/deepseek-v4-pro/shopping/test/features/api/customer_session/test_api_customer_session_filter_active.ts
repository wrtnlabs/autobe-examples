import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
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
 * Test filtering customer sessions by active status.
 *
 * Verifies that an administrator can query a specific customer's authentication session list filtered to only active sessions — those whose `expired_at` timestamp is still in the future relative to the current server time. A customer account is created via join, which automatically establishes an immediately active session with `expired_at` set 7 days forward.
 *
 * 1. Administrator registers and authenticates via join to gain access to the session listing endpoint.
 * 2. Customer registers and authenticates via join, creating an active session automatically.
 * 3. Administrator queries the customer's sessions with `active=true` in the request body.
 * 4. Validates that the paginated response contains at least one session record.
 * 5. Validates that every session in the returned data array has `active === true`, confirming the filter correctly excludes expired or terminated sessions.
 */
export async function test_api_customer_session_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup — join creates an active session
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Admin queries customer sessions filtered to active only
  const sessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          active: true,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 4. Validate results
  TestValidator.predicate(
    "at least one active session returned",
    sessions.data.length > 0,
  );
  TestValidator.predicate(
    "all returned sessions are active",
    sessions.data.every((s) => s.active === true),
  );
}
