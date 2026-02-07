import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityUsageMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_usage_metrics_time_window(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Call the usage metrics endpoint to retrieve data for last 24 hours
  const metricsResponse =
    await api.functional.community.admin.usage_metrics.index(adminConnection, {
      body: {},
    });
  typia.assert(metricsResponse);
  // 3. Validate response structure and content
  TestValidator.predicate(
    "has at least one metric record",
    metricsResponse.data.length > 0,
  );
  TestValidator.predicate(
    "pagination is valid",
    metricsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    metricsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    metricsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    metricsResponse.pagination.pages >= 0,
  );
}
