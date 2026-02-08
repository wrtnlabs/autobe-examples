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

export async function test_api_admin_moderation_logs_retrieve_unauthorized(
  connection: api.IConnection,
) {
  // 1. Perform admin join to establish admin context but DO NOT use this admin connection to test unauthorized access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is empty object
  });
  // 2. Setup non-admin user connection (unauthenticated or non-admin)
  const userConnection: api.IConnection = { host: connection.host };
  // 3. Attempt to retrieve moderation logs with unauthorized user connection
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.admin.moderation_logs.patch(
        userConnection,
        {
          body: {}, // Empty IRequest
        },
      );
    },
  );
}
