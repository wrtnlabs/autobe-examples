import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_dashboard_realtime_update(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  // Get dashboard statistics
  const dashboard =
    await api.functional.ecommerceMall.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // Validate dashboard response structure
  TestValidator.equals(
    "totalProducts is number",
    typeof dashboard.totalProducts,
    "number",
  );
  TestValidator.equals(
    "pendingCancellationRequests is number",
    typeof dashboard.pendingCancellationRequests,
    "number",
  );
  TestValidator.equals(
    "pendingRefundRequests is number",
    typeof dashboard.pendingRefundRequests,
    "number",
  );
  TestValidator.equals(
    "totalOrderItemsSold is number",
    typeof dashboard.totalOrderItemsSold,
    "number",
  );
  // Validate numeric constraints
  TestValidator.predicate(
    "totalProducts non-negative",
    dashboard.totalProducts >= 0,
  );
  TestValidator.predicate(
    "totalOrderItemsSold non-negative",
    dashboard.totalOrderItemsSold >= 0,
  );
}
