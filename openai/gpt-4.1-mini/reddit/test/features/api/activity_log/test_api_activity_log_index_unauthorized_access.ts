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

export async function test_api_activity_log_index_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin join connection to satisfy prerequisite but do not login or authenticate
  const baseConnection: api.IConnection = { host: connection.host };
  // Perform admin join (registration) prerequisite
  await authorize_admin_join(baseConnection, {});
  // Create a new connection without authentication headers
  const noAuthConnection: api.IConnection = { host: connection.host };
  // Try to access the activity logs endpoint without any admin authentication
  await TestValidator.httpError(
    "unauthorized access to activity logs",
    401,
    async () => {
      await api.functional.communityPlatform.admin.activityLogs.index(
        noAuthConnection,
        {
          body: {}, // empty filter - request all
        },
      );
    },
  );
}
