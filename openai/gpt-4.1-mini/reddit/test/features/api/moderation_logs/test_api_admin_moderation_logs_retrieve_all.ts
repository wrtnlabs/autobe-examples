import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_logs_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin join to get authorization token
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  // Update adminConnection headers with Authorization token
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${authorizedAdmin.token.access}`;
  // 2. Retrieve moderation logs with no filters (empty body)
  const response =
    await api.functional.communityPlatform.admin.moderation_logs.patch(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata consistency
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination pages consistency",
    pagination.pages === Math.ceil(pagination.records / pagination.limit) ||
      (pagination.records === 0 && pagination.pages === 0),
  );
  TestValidator.predicate(
    "pagination current page valid",
    pagination.current >= 1 && pagination.current <= (pagination.pages || 1),
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  // 4. No log entry property validation due to empty DTO schema
  // 5. Ensure only admins can access (basic test: unauthorized connection fails)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized access to moderation logs",
    async () => {
      await api.functional.communityPlatform.admin.moderation_logs.patch(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
