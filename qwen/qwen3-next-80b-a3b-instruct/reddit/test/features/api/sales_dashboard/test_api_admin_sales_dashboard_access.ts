import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDashboard";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_sales_dashboard_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Use the provided utility function to authenticate as admin
  // Generate valid admin credentials using typia.random for compliance with ICommunityPlatformAdmin.IJoin schema
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/admin/join",
    referrer: "https://example.com",
    ip: null,
  };
  // Call the authorization utility function to authenticate admin
  await authorize_admin_join(adminConnection, { body: adminCreds });
  // adminConnection.headers now contains the authorization token
  // Step 3: Use the authenticated admin connection to call the sales dashboard endpoint
  const salesDashboard: ICommunityPlatformSalesDashboard =
    await api.functional.communityPlatform.admin.analytics.sales.dashboard.index(
      adminConnection,
    );
  // Step 4: Validate the response structure and data types
  // typia.assert performs complete validation of all properties including format validations
  // for numbers with Minimum, Maximum, and Type tags (totalRevenue, averageOrderValue, etc.)
  typia.assert(salesDashboard);
}
