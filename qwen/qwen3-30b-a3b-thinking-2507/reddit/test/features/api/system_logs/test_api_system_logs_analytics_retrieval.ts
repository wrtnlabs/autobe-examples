import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_logs_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Create admin account
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  // Get analytics logs
  const response: IPageICommunityPlatformSystemLog.ISummary =
    await api.functional.communityPlatform.admin.system.logs.analytics.index(
      adminConnection,
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "Pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("Pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "Pagination records > 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "Pagination pages > 0",
    response.pagination.pages > 0,
  );
  // Validate minimum log entry count
  TestValidator.predicate("At least 5 log entries", response.data.length >= 5);
  // Validate presence of all severity levels
  const severityLevels = ["INFO", "WARNING", "ERROR"];
  severityLevels.forEach((level) => {
    TestValidator.predicate(
      `Contains ${level} level logs`,
      response.data.some(
        (entry: ICommunityPlatformSystemLog.ISummary) => entry.level === level,
      ),
    );
  });
}
