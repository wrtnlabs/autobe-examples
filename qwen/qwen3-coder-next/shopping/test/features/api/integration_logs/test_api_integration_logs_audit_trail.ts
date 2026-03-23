import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallIntegrationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_integration_logs_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for audit log access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Retrieve integration logs with filtering
  const response =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      adminConnection,
      {
        body: {
          integration_type: "payment_gateway",
          status: "failure",
          limit: 10,
          error_message: "",
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(response);
  // Validate audit log structure - typia.assert already validates all fields
  response.data.forEach((log) => {
    typia.assert(log);
  });
}