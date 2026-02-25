import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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

export async function test_api_activity_log_index_filter_by_action_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphabets(5)}@example.com`,
      password: "adminPass1234",
      displayName: `Admin${RandomGenerator.name(1)}`,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(admin);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;
  // 2. Setup filter criteria
  const actionType = "login";
  const createdAtFrom = new Date(Date.now() - 86400000 * 5).toISOString(); // 5 days ago
  const createdAtTo = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
  const page = 1;
  const limit = 10;
  // 3. Fetch filtered activity logs
  const response =
    await api.functional.communityPlatform.admin.activityLogs.index(
      adminConnection,
      {
        body: {
          actionType,
          createdAtFrom,
          createdAtTo,
          page,
          limit,
        },
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination pages correctness",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.predicate(
    "limit consistency",
    response.pagination.limit === limit,
  );
  TestValidator.predicate(
    "current page consistency",
    response.pagination.current === page,
  );
  // 5. Validate each log entry
  response.data.forEach((log) => {
    typia.assert(log);
    TestValidator.equals("log actionType", log.actionType, actionType);
    const createdAtTime = new Date(log.createdAt).getTime();
    const fromTime = new Date(createdAtFrom).getTime();
    const toTime = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      "createdAt not before createdAtFrom",
      createdAtTime >= fromTime,
    );
    TestValidator.predicate(
      "createdAt not after createdAtTo",
      createdAtTime <= toTime,
    );
    if (log.user !== null) {
      typia.assert(log.user);
    }
  });
}
