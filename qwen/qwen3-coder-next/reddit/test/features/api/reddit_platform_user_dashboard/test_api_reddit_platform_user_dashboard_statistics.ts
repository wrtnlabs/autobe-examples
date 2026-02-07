import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_reddit_platform_user_dashboard_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {
    body: {
      // IRedditPlatformUser.IJoin has no required properties
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(authResult);
  // 2. Call dashboard statistics endpoint
  const dashboardStats =
    await api.functional.redditPlatform.user.dashboard.at(userConnection);
  typia.assert(dashboardStats);
  // 3. Validate response structure (IRedditPlatformAdmin has no required properties)
  // The response should be valid IRedditPlatformAdmin with all optional metrics
}
