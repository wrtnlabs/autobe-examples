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

export async function test_api_activity_logs_analytics_no_matching_records(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  const body: ICommunityPlatformActivityLog.IRequest = {};
  const result =
    await api.functional.communityPlatform.admin.activity_logs.analytics.index(
      adminConnection,
      { body },
    );
  typia.assert(result);
  TestValidator.equals("empty data array", result.data.length, 0);
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("items per page", result.pagination.limit, 0);
  TestValidator.equals("total records", result.pagination.records, 0);
  TestValidator.equals("total pages", result.pagination.pages, 0);
}
