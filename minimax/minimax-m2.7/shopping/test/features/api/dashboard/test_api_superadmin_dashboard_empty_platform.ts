import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator accesses dashboard on a fresh platform with no data.
 *
 * Validates the dashboard endpoint returns correct zero counts when the platform
 * has no registered users, sellers, products, or orders. This test ensures that
 * a newly registered super administrator can successfully access platform statistics
 * and that all aggregation queries handle empty tables gracefully.
 *
 * The test verifies the following dashboard fields return zero values on an empty platform:
 * - Total customers count
 * - Total sellers count
 * - Approved sellers count
 * - Total products count
 * - Total orders count
 * - Pending seller approvals count
 * - Pending admin requests count
 *
 * 1. Register a new super administrator account with random credentials.
 * 2. Create authenticated connection with the super admin token.
 * 3. Call GET /ecommerceMall/superAdmin/admin/dashboard endpoint.
 * 4. Validate all dashboard counts are zero (0).
 * 5. Validate response structure matches IDashboard schema via typia.assert.
 * 6. Verify all count values are integers >= 0.
 */
export async function test_api_superadmin_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call dashboard endpoint
  const dashboard =
    await api.functional.ecommerceMall.superAdmin.admin.dashboard.at(
      superAdminConnection,
    );
  // 3. Validate response structure matches IDashboard schema
  typia.assert(dashboard);
  // 4. Validate all counts are zero on empty platform
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
  // 5. Verify all counts are integers >= 0
  TestValidator.predicate("customersCount >= 0", dashboard.customersCount >= 0);
  TestValidator.predicate("sellersCount >= 0", dashboard.sellersCount >= 0);
  TestValidator.predicate(
    "approvedSellersCount >= 0",
    dashboard.approvedSellersCount >= 0,
  );
  TestValidator.predicate("productsCount >= 0", dashboard.productsCount >= 0);
  TestValidator.predicate("ordersCount >= 0", dashboard.ordersCount >= 0);
  TestValidator.predicate(
    "pendingSellerApprovalsCount >= 0",
    dashboard.pendingSellerApprovalsCount >= 0,
  );
  TestValidator.predicate(
    "pendingAdminRequestsCount >= 0",
    dashboard.pendingAdminRequestsCount >= 0,
  );
}
