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

export async function test_api_admin_refresh_token_proactive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token exists",
    initialAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    initialAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at is future",
    new Date(initialAuth.token.expired_at) > new Date(),
  );
  // Store old refresh token for rotation test
  const oldRefreshToken = initialAuth.token.refresh;
  // 2. Proactively refresh while access token is still valid
  const refreshedAuth = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: oldRefreshToken,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 3. Verify new tokens are issued
  TestValidator.notEquals(
    "new access token differs",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  // 4. Verify expiration timestamps are updated
  TestValidator.predicate(
    "new expired_at is future",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.notEquals(
    "expired_at timestamp updated",
    refreshedAuth.token.expired_at,
    initialAuth.token.expired_at,
  );
  // 5. Verify token rotation - old refresh token should be invalidated
  await TestValidator.httpError(
    "old refresh token invalid after rotation",
    401,
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IEcommerceMallAdmin.IRefresh,
      });
    },
  );
  // 6. Verify new refresh token works
  const secondRefresh = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh_token: refreshedAuth.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(secondRefresh);
  TestValidator.notEquals(
    "second refresh produces new tokens",
    secondRefresh.token.refresh,
    refreshedAuth.token.refresh,
  );
}