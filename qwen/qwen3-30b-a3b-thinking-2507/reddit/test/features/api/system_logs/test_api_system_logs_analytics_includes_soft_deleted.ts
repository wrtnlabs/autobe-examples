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

export async function test_api_system_logs_analytics_includes_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Call the analytics endpoint
  const analytics =
    await api.functional.communityPlatform.admin.system.logs.analytics.index(
      adminConnection,
    );
  typia.assert(analytics);
  // 3. Verify minimum entries requirement
  TestValidator.predicate(
    "should include at least 3 entries",
    analytics.data.length >= 3,
  );
  // 4. Verify pagination consistency
  TestValidator.predicate(
    "should have valid limit",
    analytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "should have valid pages count",
    analytics.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "should have sufficient records",
    analytics.pagination.records >= analytics.data.length,
  );
}
