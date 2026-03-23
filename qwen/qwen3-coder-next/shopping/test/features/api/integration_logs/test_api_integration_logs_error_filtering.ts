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

export async function test_api_integration_logs_error_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Filter logs by failure status and long duration
  const errorLogs =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      superAdminConnection,
      {
        body: {
          status: "failure" as const,
          duration_ms_min: 500 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(errorLogs);
  // 3. Validate error logs structure
  for (const log of errorLogs.data) {
    TestValidator.predicate(
      "failure status >= 400",
      log.response_status >= 400,
    );
    TestValidator.notEquals("has error message", log.error_message, null);
    TestValidator.predicate("meets duration threshold", log.duration_ms >= 500);
  }
  // 4. Test integration type filtering
  const shippingLogs =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      superAdminConnection,
      {
        body: {
          integration_type: "shipping_carrier" as const,
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(shippingLogs);
  // 5. Validate date range filtering
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredLogs =
    await api.functional.ecommerceMall.admin.integration_logs.index(
      superAdminConnection,
      {
        body: {
          request_date: weekAgo.toISOString(),
          error_message: null,
        } satisfies IEcommerceMallIntegrationLog.IRequest,
      },
    );
  typia.assert(dateFilteredLogs);
}
