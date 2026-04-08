import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_log_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Get current timestamp for date range testing
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // 2. Test date range filtering with createdAtAfter and createdAtBefore
  const dateRangeResult = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {
        createdAtAfter: oneHourAgo.toISOString() as string &
          tags.Format<"date-time">,
        createdAtBefore: oneHourLater.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "has pagination data",
    dateRangeResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    dateRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    dateRangeResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    dateRangeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    dateRangeResult.pagination.pages >= 0,
  );
  // 3. Test pagination - request second page with specific limit
  const pageLimit = 5;
  const secondPageResult =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: pageLimit as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        createdAtAfter: oneHourAgo.toISOString() as string &
          tags.Format<"date-time">,
        createdAtBefore: oneHourLater.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(secondPageResult);
  // Validate pagination metadata matches request
  TestValidator.equals(
    "second page current is 2",
    secondPageResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit matches request",
    secondPageResult.pagination.limit,
    pageLimit,
  );
  // 4. Test with limit only (first page)
  const limitOnlyResult = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(limitOnlyResult);
  TestValidator.equals(
    "limit only - page defaults to 1",
    limitOnlyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit only - limit matches",
    limitOnlyResult.pagination.limit,
    10,
  );
  // 5. Test with page only
  const pageOnlyResult = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(pageOnlyResult);
  TestValidator.equals(
    "page only - page is 1",
    pageOnlyResult.pagination.current,
    1,
  );
  // 6. Test filtering by targetEntityId (using UUID format)
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const targetEntityResult =
    await api.functional.erpHrm.admin.activity_logs.index(adminConnection, {
      body: {
        targetEntityId: targetEntityId,
      } satisfies IErpHrmActivityLog.IRequest,
    });
  typia.assert(targetEntityResult);
  // All returned entries should have matching targetEntityId
  for (const log of targetEntityResult.data) {
    TestValidator.equals(
      "targetEntityId matches filter",
      log.targetEntityId,
      targetEntityId,
    );
  }
  // 7. Test with no filters (retrieve all with defaults)
  const allLogsResult = await api.functional.erpHrm.admin.activity_logs.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmActivityLog.IRequest,
    },
  );
  typia.assert(allLogsResult);
  TestValidator.predicate("has data array", Array.isArray(allLogsResult.data));
}
