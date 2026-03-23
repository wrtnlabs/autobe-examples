import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallApiLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallApiLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallApiLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_api_logs_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin to get authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as const satisfies string & tags.Format<"password">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Prepare filter criteria for API logs search
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  // 3. Request filtered API logs with multiple criteria
  const logs = await api.functional.ecommerceMall.admin.api_logs.index(
    adminConnection,
    {
      body: {
        ip: "192.168.1.",
        href: "/orders",
        method: "POST",
        response_status: 200,
        latency_ms_range: {
          min: 100,
          max: 500,
        },
        error_message: false,
        created_at_range: {
          from: yesterday.toISOString(),
          to: today.toISOString(),
        },
        limit: 10,
      } satisfies IEcommerceMallApiLog.IRequest,
    },
  );
  typia.assert(logs);
  // 4. Validate response structure and pagination
  TestValidator.equals("pagination exists", logs.pagination.current, 1);
  TestValidator.predicate("records count", logs.pagination.records >= 0);
  TestValidator.predicate("has data", logs.data.length >= 0);
  // 5. Validate that all returned logs match filter criteria
  logs.data.forEach((log, index) => {
    TestValidator.predicate(
      `log ${index} IP matches`,
      log.ip.startsWith("192.168.1."),
    );
    TestValidator.predicate(
      `log ${index} URL contains orders`,
      log.href.includes("/orders"),
    );
    TestValidator.equals(`log ${index} method`, log.method, "POST");
    TestValidator.equals(`log ${index} status`, log.response_status, 200);
    TestValidator.predicate(
      `log ${index} latency range`,
      log.latency_ms >= 100 && log.latency_ms <= 500,
    );
    TestValidator.equals(`log ${index} no error`, log.error_message, null);
  });
}
