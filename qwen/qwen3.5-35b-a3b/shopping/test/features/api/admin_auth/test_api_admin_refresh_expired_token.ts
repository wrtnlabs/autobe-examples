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

export async function test_api_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com/admin/join",
      referrer: "https://test.com/admin",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResponse);
  // 2. Test refresh with an invalid/expired token (malformed token to simulate expiration)
  // Since we cannot manipulate database to set refreshable_until to past, we use
  // an invalid token that should be rejected with 401
  const expiredRefreshToken: IEcommerceMallAdmin.IRefresh = {
    refresh_token: typia.random<string & tags.Format<"uuid">>(),
  };
  // 3. Attempt to refresh with invalid token and expect 401 error
  await TestValidator.httpError(
    "invalid refresh token should return 401 unauthorized",
    [401],
    async () => {
      await api.functional.ecommerceMall.auth.admin.refresh(connection, {
        body: expiredRefreshToken,
      });
    },
  );
}
