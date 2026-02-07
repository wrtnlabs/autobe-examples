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

export async function test_api_admin_usage_metrics_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityAdmin.IJoin,
  });
  // Fetch first page
  const firstPage: IPageICommunityUsageMetric.ISummary =
    await api.functional.community.admin.usage_metrics.index(adminConnection, {
      body: {} satisfies ICommunityUsageMetric.IRequest,
    });
  typia.assert(firstPage);
  // Fetch second page (same empty body - server decides pagination)
  const secondPage: IPageICommunityUsageMetric.ISummary =
    await api.functional.community.admin.usage_metrics.index(adminConnection, {
      body: {} satisfies ICommunityUsageMetric.IRequest,
    });
  typia.assert(secondPage);
  // Validate pagination continuity: second page should be after first
  TestValidator.predicate(
    "second page's current page > first page's current page",
    secondPage.pagination.current > firstPage.pagination.current,
  );
}
