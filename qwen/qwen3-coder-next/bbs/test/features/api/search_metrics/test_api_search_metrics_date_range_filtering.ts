import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSearchMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSearchMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_search_metrics_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authenticating requests
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Test search metrics filtering by date range
  const metrics = await api.functional.discussionBoard.search.metrics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    },
  );
  typia.assert(metrics);
  // Validate response structure
  TestValidator.predicate(
    "has pagination data",
    metrics.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(metrics.data));
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has positive current page",
    metrics.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    metrics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records count",
    metrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages count",
    metrics.pagination.pages >= 0,
  );
}
