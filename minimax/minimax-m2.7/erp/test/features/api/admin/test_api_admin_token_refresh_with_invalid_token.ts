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

export async function test_api_admin_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account to establish valid session context
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  // 2. Attempt to refresh tokens using a fabricated invalid refresh token
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  const fabricatedToken: string = RandomGenerator.alphaNumeric(64);
  // 3. Validate that the system rejects the invalid refresh token with an error
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.erpHrm.auth.admin.refresh(invalidRefreshConnection, {
        body: {
          refresh: fabricatedToken,
        } satisfies IErpHrmAdmin.IRefresh,
      });
    },
  );
  // 4. Also test with another invalid token format (tampered JWT-like string)
  const tamperedTokenConnection: api.IConnection = { host: connection.host };
  const tamperedToken: string = `${authorized.token.refresh.slice(0, 20)}INVALIDSUFFIX`;
  await TestValidator.error(
    "tampered refresh token should be rejected",
    async () => {
      await api.functional.erpHrm.auth.admin.refresh(tamperedTokenConnection, {
        body: {
          refresh: tamperedToken,
        } satisfies IErpHrmAdmin.IRefresh,
      });
    },
  );
}
