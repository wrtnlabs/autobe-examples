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

export async function test_api_admin_refresh_deleted_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin account and retrieve its refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  typia.assert(joinResponse);
  const refreshToken = joinResponse.token.refresh;
  // 2. Attempt to refresh using a valid refresh token from an account that has been permanently deleted (contextually assumed)
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh fails with 401 Unauthorized when admin account is deleted",
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: { refresh: refreshToken } satisfies ICommunityAdmin.IRefresh,
      });
    },
  );
}
