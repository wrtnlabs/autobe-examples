import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_logs_analytics_filter_by_user_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  // ICommunityPlatformAdmin.IJoin is an empty type, so provide empty body
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare test filtering parameters
  const userId = typia.random<string & tags.Format<"uuid">>();
  const startDateISO = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 10,
  ).toISOString(); // 10 days ago
  const endDateISO = new Date().toISOString(); // now
  // 3. Prepare request body with filtering and pagination
  const requestBody = {
    userId: userId,
    startDate: startDateISO,
    endDate: endDateISO,
    limit: 5,
    offset: 0,
    sort: "updated_at",
    order: "desc",
  };
  // 4. Call the activity logs analytics index API using adminConnection
  const result =
    await api.functional.communityPlatform.admin.activity_logs.analytics.index(
      adminConnection,
      {
        body: requestBody as unknown as ICommunityPlatformActivityLog.IRequest,
      },
    );
  typia.assert(result);
  // 5. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is 1 or more",
    () => result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    () => result.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    () => result.pagination.pages === Math.ceil(result.pagination.records / 5),
  );
  // 6. Validate each log entry's structure
  for (const log of result.data) {
    typia.assert(log);
  }
}
