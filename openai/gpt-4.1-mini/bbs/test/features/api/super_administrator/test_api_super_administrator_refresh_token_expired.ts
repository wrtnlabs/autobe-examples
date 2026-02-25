import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to refresh tokens with an expired refresh token for superAdministrator.
  // Expect the request to be rejected with an authorization error due to token expiration.
  // Verify that no new tokens are issued and appropriate error details returned.
  // 1. SuperAdministrator join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(joined);
  // 2. Prepare expired refresh token (a dummy expired token string)
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired_signature_part";
  // 3. Attempt to refresh with expired token, expect authorization error
  await TestValidator.httpError(
    "refresh token expired error",
    401,
    async () => {
      await authorize_super_administrator_refresh(superAdminConnection, {
        body: {
          refreshToken: expiredRefreshToken,
        } satisfies IDiscussionBoardSuperAdministrator.IRefresh,
      });
    },
  );
}
