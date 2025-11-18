import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActivityStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActivityStatsSummary";
import type { IShoppingMallAdminGovernanceOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminGovernanceOverview";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallLegalHoldStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldStatsSummary";
import type { IShoppingMallOrderDailyStatPoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDailyStatPoint";
import type { IShoppingMallOrderStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatsSummary";
import type { IShoppingMallPlatformKpisSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformKpisSummary";
import type { IShoppingMallRefundAndDisputeStatsSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundAndDisputeStatsSummary";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify governance overview RBAC: non-admins are forbidden, admin is allowed.
 *
 * Business goal: Ensure that the aggregated governance dashboard endpoint GET
 * /shoppingMall/admin/adminDashboard/governanceOverview is only accessible to
 * administrator accounts. Customer and seller actors must not be able to
 * retrieve this data, while an authenticated admin should receive a valid
 * IShoppingMallAdminGovernanceOverview payload.
 *
 * Test flow:
 *
 * 1. Register a customer via /auth/customer/join. This sets the connection
 *    Authorization header for the customer.
 * 2. While authenticated as the customer, attempt to call
 *    /shoppingMall/admin/adminDashboard/governanceOverview and assert that it
 *    results in an error using TestValidator.error.
 * 3. Register a seller via /auth/seller/join, which overwrites the Authorization
 *    header with a seller token.
 * 4. While authenticated as the seller, again attempt the governance overview call
 *    and assert that it fails with an error.
 * 5. Register an admin via /auth/admin/join so that the Authorization header now
 *    carries an admin access token.
 * 6. As an admin, successfully call the governance overview endpoint and validate
 *    the returned payload using typia.assert, plus a small business-level
 *    predicate.
 */
export async function test_api_admin_governance_overview_forbidden_for_non_admin_roles(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain a customer-authenticated connection
  const customerRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    {
      body: customerRequestBody,
    },
  );
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Customer should not be able to access governance overview
  await TestValidator.error(
    "customer must not access governance overview",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
        connection,
      );
    },
  );

  // 3. Register a seller and obtain a seller-authenticated connection
  const sellerRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerRequestBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 4. Seller should not be able to access governance overview
  await TestValidator.error(
    "seller must not access governance overview",
    async () => {
      await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
        connection,
      );
    },
  );

  // 5. Register an admin and obtain an admin-authenticated connection
  const adminRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminRequestBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 6. Admin should be able to access governance overview successfully
  const overview: IShoppingMallAdminGovernanceOverview =
    await api.functional.shoppingMall.admin.adminDashboard.governanceOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminGovernanceOverview>(overview);

  // Basic business-level predicate: total orders and counts should be
  // non-negative; we rely on typia.assert for structural validation.
  TestValidator.predicate("orderStats.totalOrders is non-negative", () => {
    return overview.orderStats.totalOrders >= 0;
  });

  TestValidator.predicate(
    "platformKpis.activeCustomerCount is non-negative",
    () => overview.platformKpis.activeCustomerCount >= 0,
  );
}
