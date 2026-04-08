import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to get valid credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Attempt to refresh with an expired/invalid refresh token
  // Use a random string that is NOT a valid refresh token to simulate expiration
  const expiredRefreshToken = typia.random<string & tags.Format<"password">>();
  // 3. Verify that the system rejects the expired token with 401 Unauthorized
  await TestValidator.httpError(
    "expired refresh token rejected",
    401,
    async () => {
      await api.functional.erpHrm.auth.admin.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: expiredRefreshToken,
          } satisfies IErpHrmAdmin.IRefresh,
        },
      );
    },
  );
}
