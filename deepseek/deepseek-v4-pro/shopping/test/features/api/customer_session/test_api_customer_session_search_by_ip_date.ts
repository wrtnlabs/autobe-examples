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
 * Test administrator search of customer sessions using combined IP address and date range filters.
 *
 * Verifies that an administrator can trace customer login activity by combining
 * partial IP address matching with a creation date range filter. This capability
 * is essential for security audit investigations where administrators need to
 * identify sessions originating from specific network ranges within defined time
 * windows.
 *
 * The test creates a customer account with a known IPv4 address and records
 * timestamps immediately before and after the registration to define a precise
 * date range. The administrator then queries the customer's session list using
 * a substring of the recorded IP and the bracketing date range, validating that
 * the session appears in the filtered results.
 *
 * 1. Administrator registers and authenticates via admin join.
 * 2. Customer joins with a known IPv4 address, bracketed by recorded timestamps.
 * 3. Administrator queries customer sessions with IP substring and date range filters.
 * 4. Validates the customer session exists in the filtered results.
 */
export async function test_api_customer_session_search_by_ip_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration with known IP and timestamp recording
  const knownIp = "203.0.113.42";
  const customerConnection: api.IConnection = { host: connection.host };
  const beforeJoin = new Date();
  const customer = await authorize_customer_join(customerConnection, {
    body: { ip: knownIp },
  });
  const afterJoin = new Date();
  typia.assert(customer);
  // 3. Administrator searches customer sessions
  const sessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId: customer.id,
        body: {
          ip: "203.0.113",
          created_at_from: beforeJoin.toISOString(),
          created_at_to: afterJoin.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessions);
  // 4. Validate session appears in filtered results
  TestValidator.predicate(
    "at least one session matches IP and date filters",
    sessions.data.length > 0,
  );
  TestValidator.predicate(
    "session IP contains search substring",
    sessions.data[0].ip.includes("203.0.113"),
  );
}
