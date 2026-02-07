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

export async function test_api_search_metrics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Make multiple search requests to generate metrics data
  const searchMetricCount = 15;
  for (let i = 0; i < searchMetricCount; i++) {
    await api.functional.discussionBoard.search.metrics(adminConnection, {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    });
  }
  // 3. Test pagination with limit=5, expect 3 pages
  const page1 = await api.functional.discussionBoard.search.metrics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    },
  );
  typia.assert(page1);
  // 4. Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 records",
    page1.pagination.records,
    searchMetricCount,
  );
  TestValidator.equals("page 1 pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data count", page1.data.length, 10);
  // 5. Test second page
  const page2 = await api.functional.discussionBoard.search.metrics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data count", page2.data.length, 5);
  // 6. Test third page (last page)
  const page3 = await api.functional.discussionBoard.search.metrics(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSearchMetric.IRequest>(),
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 data count", page3.data.length, 0);
  // 7. Verify pagination consistency
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  TestValidator.equals(
    "total records consistent with page3",
    page1.pagination.records,
    page3.pagination.records,
  );
}
