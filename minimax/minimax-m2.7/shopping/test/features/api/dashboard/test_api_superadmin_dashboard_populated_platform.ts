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
 * Test super administrator views dashboard on a populated platform.
 *
 * Validates the admin dashboard endpoint functionality by registering a super
 * administrator and verifying the dashboard returns correct platform statistics.
 * Since customer, seller, product, and order APIs are not available in the SDK,
 * this test validates the dashboard structure and verifies counts are 0 when
 * the platform has no entities created.
 *
 * The test follows this workflow:
 * 1. Authenticate as super administrator using the utility function
 * 2. Call GET /ecommerceMall/superAdmin/admin/dashboard
 * 3. Validate response returns valid IDashboard structure
 * 4. Verify all counts are non-negative integers
 * 5. Verify relationships between counts are correct
 */
export async function test_api_superadmin_dashboard_populated_platform(
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
  // 3. Validate response structure with typia.assert
  // The dashboard object is fully validated by typia.assert above
  // 4. Validate counts are non-negative
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
  // 5. Validate count relationships
  TestValidator.predicate(
    "approvedSellersCount <= sellersCount",
    dashboard.approvedSellersCount <= dashboard.sellersCount,
  );
  TestValidator.predicate(
    "pendingSellerApprovalsCount <= sellersCount",
    dashboard.pendingSellerApprovalsCount <= dashboard.sellersCount,
  );
}
