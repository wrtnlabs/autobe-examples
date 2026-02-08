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

export async function test_api_admin_moderation_logs_retrieve_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Retrieve moderation logs with empty filter
  const response =
    await api.functional.communityPlatform.admin.moderation_logs.patch(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  // 4. Removed validation of deleted_at property which does not exist
}