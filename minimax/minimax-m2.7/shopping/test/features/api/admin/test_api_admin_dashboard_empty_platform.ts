import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin dashboard on a fresh platform with no data.
 *
 * Validates that the admin dashboard correctly handles empty data states by returning zero counts for all platform statistics. This includes customers, sellers (total and approved), products, orders, and pending approval counts.
 *
 * **Test Flow:**
 *
 * 1. Register a new admin account on a platform with no existing data
 * 2. Authenticate the admin connection with the returned JWT token
 * 3. Retrieve the admin dashboard statistics
 * 4. Validate all counts are zero since no platform data exists yet
 *
 * **Expected Results:**
 *
 * - customersCount: 0 (no registered customers)
 * - sellersCount: 0 (no registered sellers)
 * - approvedSellersCount: 0 (no approved sellers)
 * - productsCount: 0 (no listed products)
 * - ordersCount: 0 (no purchase orders)
 * - pendingSellerApprovalsCount: 0 (no pending seller applications)
 * - pendingAdminRequestsCount: 0 (no admin privilege requests)
 */
export async function test_api_admin_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin on empty platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get dashboard statistics
  const dashboard =
    await api.functional.ecommerceMall.admin.admin.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all counts are zero on empty platform
  TestValidator.equals("customersCount is 0", dashboard.customersCount, 0);
  TestValidator.equals("sellersCount is 0", dashboard.sellersCount, 0);
  TestValidator.equals(
    "approvedSellersCount is 0",
    dashboard.approvedSellersCount,
    0,
  );
  TestValidator.equals("productsCount is 0", dashboard.productsCount, 0);
  TestValidator.equals("ordersCount is 0", dashboard.ordersCount, 0);
  TestValidator.equals(
    "pendingSellerApprovalsCount is 0",
    dashboard.pendingSellerApprovalsCount,
    0,
  );
  TestValidator.equals(
    "pendingAdminRequestsCount is 0",
    dashboard.pendingAdminRequestsCount,
    0,
  );
}
