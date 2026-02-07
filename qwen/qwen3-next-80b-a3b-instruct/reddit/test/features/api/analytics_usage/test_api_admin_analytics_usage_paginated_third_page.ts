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

export async function test_api_admin_analytics_usage_paginated_third_page(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Fetch first two pages to reach the third
  await api.functional.community.admin.analytics.usage.index(adminConnection);
  await api.functional.community.admin.analytics.usage.index(adminConnection);
  // 3. Fetch third page
  const thirdPage =
    await api.functional.community.admin.analytics.usage.index(adminConnection);
  typia.assert(thirdPage);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    thirdPage.pagination.current,
    3,
  );
  TestValidator.equals("pagination limit", thirdPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records positive",
    thirdPage.pagination.records > 0,
  );
  // 5. Validate data array length
  TestValidator.equals(
    "third page data array length",
    thirdPage.data.length,
    5,
  );
}
