import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIReportsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIReportsAnalytic";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IReportsAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportsAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reports_analytics_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Create analytics connection with admin token
  const analyticsConnection: api.IConnection = { host: connection.host };
  analyticsConnection.headers = {
    ...analyticsConnection.headers,
    Authorization: adminAuth.token.access,
  };
  // 3. Calculate future dates (1 year from now) - guaranteed no reports exist
  const now = new Date();
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const startDate = futureDate.toISOString().split("T")[0];
  const endDate = futureDate.toISOString().split("T")[0];
  // 4. Test analytics query with future date range (guaranteed empty results)
  const emptyResponse =
    await api.functional.redditPlatform.admin.reports.analytics.index(
      analyticsConnection,
      {
        body: {
          startDate,
          endDate,
        } satisfies IReportsAnalytic.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // 5. Verify pagination metadata for empty results
  TestValidator.equals(
    "empty response records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty response pages",
    emptyResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty response current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty response limit",
    emptyResponse.pagination.limit,
    100,
  );
  // 6. Verify data array is empty
  TestValidator.equals("data array empty length", emptyResponse.data.length, 0);
  // 7. Test with status filter (pending) - should also return empty
  const statusFilteredResponse =
    await api.functional.redditPlatform.admin.reports.analytics.index(
      analyticsConnection,
      {
        body: {
          status: "pending" as const,
        } satisfies IReportsAnalytic.IRequest,
      },
    );
  typia.assert(statusFilteredResponse);
  // 8. Verify status-filtered response also has zero records
  TestValidator.equals(
    "status-filtered response records",
    statusFilteredResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "status-filtered data array empty",
    statusFilteredResponse.data.length,
    0,
  );
  // 9. Test with contentType filter (post) - should also return empty
  const contentTypeFilteredResponse =
    await api.functional.redditPlatform.admin.reports.analytics.index(
      analyticsConnection,
      {
        body: {
          contentType: "post" as const,
        } satisfies IReportsAnalytic.IRequest,
      },
    );
  typia.assert(contentTypeFilteredResponse);
  // 10. Verify content-type-filtered response also has zero records
  TestValidator.equals(
    "content-type-filtered response records",
    contentTypeFilteredResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "content-type-filtered data array empty",
    contentTypeFilteredResponse.data.length,
    0,
  );
}
