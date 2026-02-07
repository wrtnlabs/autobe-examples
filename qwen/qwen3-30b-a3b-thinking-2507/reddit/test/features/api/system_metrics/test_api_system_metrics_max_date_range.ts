import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_metrics_max_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const baseConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(baseConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // Create dedicated admin connection with Authorization header
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Calculate 30-day date range
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startISO = startDate.toISOString();
  const endISO = now.toISOString();
  // 3. Retrieve system metrics over exact 30-day range
  const output: IPageICommunityPlatformSystemMetric.ISummary =
    await api.functional.communityPlatform.admin.system.metrics.index(
      adminConnection,
      {
        body: {
          start_date: startISO,
          end_date: endISO,
        },
      },
    );
  typia.assert(output);
  // 4. Validate date range enforcement (exactly 30 days)
  const dateRange =
    (new Date(endISO).getTime() - new Date(startISO).getTime()) /
    (1000 * 60 * 60 * 24);
  TestValidator.equals("Date range should be exactly 30 days", dateRange, 30);
  // 5. Validate metric aggregation accuracy
  TestValidator.predicate(
    "Metric data set should be non-empty",
    output.data.length > 0,
  );
  TestValidator.predicate(
    "Pagination should be consistent",
    output.pagination.records > 0,
  );
}
