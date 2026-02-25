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

export async function test_api_system_metrics_access_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random metric ID for testing
  const metricId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access the system metrics endpoint without authentication
  // This should result in an authorization error (HTTP 401 or 403)
  await TestValidator.httpError(
    "system metrics access without authentication should fail",
    [401, 403],
    async () => {
      await api.functional.ecommerce.administrator.system_metrics.at(
        connection,
        {
          metricId,
        },
      );
    },
  );
}
