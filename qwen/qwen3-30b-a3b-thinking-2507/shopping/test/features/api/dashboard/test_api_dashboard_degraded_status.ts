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

export async function test_api_dashboard_degraded_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Call the dashboard endpoint
  const dashboard =
    await api.functional.ecommerce.admin.dashboards.at(adminConnection);
  typia.assert(dashboard);
  // 3. Validate the response
  TestValidator.equals(
    "system status should be degraded",
    dashboard.systemStatus,
    "degraded",
  );
  TestValidator.predicate(
    "newOrdersToday should be non-negative",
    dashboard.newOrdersToday >= 0,
  );
  TestValidator.predicate(
    "revenueToday should be non-negative",
    dashboard.revenueToday >= 0,
  );
  TestValidator.predicate(
    "activeSellers should be non-negative",
    dashboard.activeSellers >= 0,
  );
  TestValidator.predicate(
    "newSellersRatio should exist",
    dashboard.newSellersRatio !== undefined,
  );
  TestValidator.predicate(
    "systemUptime should be reasonable",
    dashboard.systemUptime >= 0 && dashboard.systemUptime <= 100,
  );
  TestValidator.predicate(
    "pendingCancellations should be non-negative",
    dashboard.pendingCancellations >= 0,
  );
}
