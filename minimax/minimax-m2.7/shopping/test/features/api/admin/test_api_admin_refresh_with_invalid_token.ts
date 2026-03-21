import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (dependency prerequisite)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Attempt token refresh with an invalid/malformed refresh token
  // This should be rejected with authentication error
  await TestValidator.error("invalid refresh token rejected", async () => {
    await api.functional.ecommerceMall.auth.admin.refresh(adminConnection, {
      body: {
        refresh_token: "invalid.token.here",
      } satisfies IEcommerceMallAdmin.IRefresh,
    });
  });
}
