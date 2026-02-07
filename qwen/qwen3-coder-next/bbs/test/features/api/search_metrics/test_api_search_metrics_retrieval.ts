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

export async function test_api_search_metrics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Retrieve search metrics
  const metrics = await api.functional.discussionBoard.search.metrics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    },
  );
  typia.assert(metrics);
  // 3. Validate response structure
  TestValidator.equals("has pagination", metrics.pagination.current, 1);
  TestValidator.predicate(
    "has non-negative records",
    metrics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has non-negative pages",
    metrics.pagination.pages >= 0,
  );
  TestValidator.predicate("limit is positive", metrics.pagination.limit > 0);
}
