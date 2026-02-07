import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_dashboard_normal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Get dashboard data
  const dashboard =
    await api.functional.ecommerce.admin.dashboards.at(adminConnection);
  typia.assert(dashboard);
  // 3. Validate required metrics
  TestValidator.equals(
    "system status should be operational",
    dashboard.systemStatus,
    "operational",
  );
  TestValidator.predicate(
    "new orders count should be non-zero",
    dashboard.newOrdersToday > 0,
  );
  TestValidator.predicate(
    "revenue should be positive",
    dashboard.revenueToday > 0,
  );
  TestValidator.predicate(
    "active sellers count should be non-zero",
    dashboard.activeSellers > 0,
  );
  TestValidator.predicate(
    "pending cancellations count should be non-zero",
    dashboard.pendingCancellations > 0,
  );
  TestValidator.equals(
    "new sellers ratio should be a string",
    typeof dashboard.newSellersRatio,
    "string",
  );
  TestValidator.predicate(
    "system uptime should be a valid number",
    !Number.isNaN(dashboard.systemUptime),
  );
}
