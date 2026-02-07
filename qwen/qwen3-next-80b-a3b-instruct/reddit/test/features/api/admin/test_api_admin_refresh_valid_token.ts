import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new system administrator account with a valid refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const joinedAdmin = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(joinedAdmin);
  // 2. Use the refresh token from the joined admin to perform refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: joinedAdmin.token.refresh,
    } satisfies ICommunityAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 3. Validate the refresh workflow
  TestValidator.equals(
    "new access token is different",
    joinedAdmin.token.access,
    refreshedAdmin.token.access,
  );
  TestValidator.equals(
    "refresh token is preserved",
    joinedAdmin.token.refresh,
    refreshedAdmin.token.refresh,
  );
  TestValidator.predicate("new access token is not expired", () => {
    const now = new Date().toISOString();
    return now < refreshedAdmin.token.expired_at;
  });
  TestValidator.predicate("refresh token is still valid", () => {
    const now = new Date().toISOString();
    return now < refreshedAdmin.token.refreshable_until;
  });
}
