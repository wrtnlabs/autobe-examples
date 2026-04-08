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
 * Test super administrator views dashboard with platform statistics.
 *
 * Validates the super admin dashboard endpoint by authenticating as a super administrator
 * and retrieving platform-wide statistics. The dashboard provides aggregated counts of
 * customers, sellers, products, orders, and pending approval items requiring administrative attention.
 *
 * This test ensures that:
 * - Super administrators can successfully authenticate and access the dashboard
 * - The dashboard endpoint returns properly structured statistics data
 * - All count fields are present and valid non-negative integers
 * - The response conforms to the IEcommerceMallAdmin.IDashboard type specification
 *
 * 1. Create authenticated super admin connection via authorize_super_admin_join
 * 2. Call GET /ecommerceMall/superAdmin/admin/dashboard endpoint
 * 3. Validate response has all required count fields
 * 4. Verify all counts are non-negative integers
 * 5. Confirm dashboard data structure matches IDashboard type
 */
export async function test_api_superadmin_dashboard_pending_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call dashboard endpoint
  const dashboard =
    await api.functional.ecommerceMall.superAdmin.admin.dashboard.at(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all required count fields exist and are non-negative
  TestValidator.predicate(
    "customersCount is non-negative",
    dashboard.customersCount >= 0,
  );
  TestValidator.predicate(
    "sellersCount is non-negative",
    dashboard.sellersCount >= 0,
  );
  TestValidator.predicate(
    "approvedSellersCount is non-negative",
    dashboard.approvedSellersCount >= 0,
  );
  TestValidator.predicate(
    "productsCount is non-negative",
    dashboard.productsCount >= 0,
  );
  TestValidator.predicate(
    "ordersCount is non-negative",
    dashboard.ordersCount >= 0,
  );
  TestValidator.predicate(
    "pendingSellerApprovalsCount is non-negative",
    dashboard.pendingSellerApprovalsCount >= 0,
  );
  TestValidator.predicate(
    "pendingAdminRequestsCount is non-negative",
    dashboard.pendingAdminRequestsCount >= 0,
  );
  // 4. Validate business logic constraints
  // Approved sellers cannot exceed total sellers
  TestValidator.predicate(
    "approvedSellersCount <= sellersCount",
    dashboard.approvedSellersCount <= dashboard.sellersCount,
  );
}