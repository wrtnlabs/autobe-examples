import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_health_comprehensive_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for health check
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // Admin registration body (empty for this implementation)
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Test system health endpoint with admin authentication
  const healthStatus =
    await api.functional.shoppingMall.admin.dashboard.health.at(
      adminConnection,
    );
  typia.assert(healthStatus);
}
