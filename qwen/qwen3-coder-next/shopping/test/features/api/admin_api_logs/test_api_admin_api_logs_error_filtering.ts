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

export async function test_api_admin_api_logs_error_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  const now = new Date().toISOString();
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
  // 2. Make API requests to generate logs
  await Promise.all(
    ArrayUtil.repeat(3, async () =>
      api.functional.ecommerceMall.admin.api_logs.index(adminConnection, {
        body: { limit: 10 },
      }),
    ),
  );
  // 3. Filter logs with error_message=true
  const errorFiltered = await api.functional.ecommerceMall.admin.api_logs.index(
    adminConnection,
    {
      body: {
        error_message: true,
        created_at_range: {
          from: fiveMinutesAgo,
          to: now,
        },
      },
    },
  );
  typia.assert(errorFiltered);
  // 4. Validate all returned logs have non-null error_message
  TestValidator.predicate(
    "all logs have error messages",
    errorFiltered.data.every((log) => log.error_message !== null),
  );
  // 5. Validate date range filtering
  for (const log of errorFiltered.data) {
    TestValidator.predicate(
      "log within date range",
      log.created_at >= fiveMinutesAgo && log.created_at <= now,
    );
  }
  // 6. Validate latency_ms values are included
  TestValidator.predicate(
    "all logs have latency_ms",
    errorFiltered.data.every((log) => log.latency_ms !== undefined),
  );
  // 7. Test pagination navigation
  if (errorFiltered.pagination.records > errorFiltered.data.length) {
    const lastLog = errorFiltered.data[errorFiltered.data.length - 1];
    const nextPage = await api.functional.ecommerceMall.admin.api_logs.index(
      adminConnection,
      {
        body: {
          error_message: true,
          page: {
            cursor: lastLog.id,
            limit: errorFiltered.pagination.limit,
            direction: "desc",
          },
        },
      },
    );
    typia.assert(nextPage);
    // Verify next page has different data
    const currentIds = errorFiltered.data.map((d) => d.id);
    const nextIds = nextPage.data.map((d) => d.id);
    TestValidator.notEquals(
      "next page has different data",
      currentIds,
      nextIds,
    );
  }
}
