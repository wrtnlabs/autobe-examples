import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const password = "P@ssw0rd1234";
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_administrator_refresh(refreshConnection, {
    body: {
      refreshToken: loggedIn.token.refresh,
    } satisfies IMallPlatformAdministrator.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "administrator id should remain the same",
    refreshed.id,
    loggedIn.id,
  );
  TestValidator.equals(
    "administrator email should remain the same",
    refreshed.email,
    loggedIn.email,
  );
  TestValidator.equals(
    "administrator grade should remain the same",
    refreshed.grade,
    loggedIn.grade,
  );
  TestValidator.equals(
    "administrator status should remain the same",
    refreshed.status,
    loggedIn.status,
  );
  TestValidator.equals(
    "administrator deleted_at should remain the same",
    refreshed.deleted_at,
    loggedIn.deleted_at,
  );
  TestValidator.predicate(
    "refreshed access token should be present",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be present",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed access expiration should be present",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh expiration should be present",
    refreshed.token.refreshable_until.length > 0,
  );
}
