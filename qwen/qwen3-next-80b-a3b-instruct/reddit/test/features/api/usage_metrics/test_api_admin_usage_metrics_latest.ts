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

export async function test_api_admin_usage_metrics_latest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize admin access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Retrieve latest usage metrics (no filters - empty request)
  const response = await api.functional.community.admin.usage_metrics.index(
    adminConnection,
    {
      body: {} satisfies ICommunityUsageMetric.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 50);
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    Math.ceil(response.pagination.records / 50),
  );
  // 4. Validate data array structure
  TestValidator.equals("data array length", response.data.length, 50);
  TestValidator.predicate("data array is not empty", response.data.length > 0);
  // 5. Validate each data item is ICommunityUsageMetric.ISummary
  for (const metric of response.data) {
    typia.assert<ICommunityUsageMetric.ISummary>(metric);
  }
}
