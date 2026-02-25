import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator access to system metrics management.
 * Administrator registers on platform, then accesses specific system metric record
 * using valid UUID. Validate successful retrieval of complete metric details.
 */
export async function test_api_system_metrics_administrator_access(
  connection: api.IConnection,
): Promise<void> {
  // Administrator setup using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuth);
  // Create authorized admin connection with token
  const authorizedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // Retrieve system metric
  const metric = await api.functional.ecommerce.administrator.system_metrics.at(
    authorizedAdminConnection,
    {
      metricId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(metric);
  // No additional validation needed - typia.assert() provides complete validation
}
