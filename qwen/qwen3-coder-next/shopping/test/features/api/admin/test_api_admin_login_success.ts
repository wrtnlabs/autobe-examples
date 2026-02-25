import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account first (join)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin-test@test.com",
    password: "admin1234!@#",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Login with the created admin account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: adminCredentials,
  });
  typia.assert(loginResult);
  // 3. Validate login result structure
  TestValidator.predicate("has valid access token", () => {
    return loginResult.access_token.length > 0;
  });
  TestValidator.predicate("has valid refresh token", () => {
    return loginResult.refresh_token.length > 0;
  });
  TestValidator.equals(
    "email matches",
    loginResult.email,
    adminCredentials.email,
  );
  TestValidator.predicate("has admin role", () => {
    return (
      loginResult.role_grade === "admin" ||
      loginResult.role_grade === "super_administrator"
    );
  });
  TestValidator.predicate("has valid expiration timestamps", () => {
    const now = new Date();
    const accessExpired = new Date(loginResult.access_expired_at);
    const refreshExpired = new Date(loginResult.refresh_expired_at);
    return accessExpired > now && refreshExpired > accessExpired;
  });
}
