import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_dashboard_with_existing_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account
  const registerConnection: api.IConnection = { host: connection.host };
  const adminData = typia.random<IRedditLikeAdmin.IJoin>();
  const authorized = await authorize_admin_join(registerConnection, {
    body: adminData,
  });
  typia.assert(authorized);
  // 2. Login admin to establish session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuthorized = await authorize_admin_login(loginConnection, {
    body: {
      email: adminData.email,
      password: adminData.password,
    },
  });
  typia.assert(loginAuthorized);
  // 3. Refresh token to maintain session continuity
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshAuthorized = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: loginAuthorized.token.refresh,
    },
  });
  typia.assert(refreshAuthorized);
  // 4. Retrieve analytics dashboard
  const dashboard =
    await api.functional.redditLike.admin.analytics.dashboard.at(
      refreshConnection,
    );
  typia.assert(dashboard);
}
