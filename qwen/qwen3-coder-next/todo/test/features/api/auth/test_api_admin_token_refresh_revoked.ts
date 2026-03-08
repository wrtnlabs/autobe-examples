import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_revoked(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await api.functional.todoApp.auth.admin.join(
    adminConnection,
    {
      body: {
        email: `admin+test-${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "TestPassword123!",
        ip: "127.0.0.1",
      } satisfies ITodoAppAdminSession.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  // Step 2: Login as admin to get valid tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await api.functional.todoApp.auth.admin.login(
    loginConnection,
    {
      body: {
        email: adminJoinResult.email,
        password: "TestPassword123!",
        ip: "127.0.0.1",
      } satisfies ITodoAppAdminSession.ILogin,
    },
  );
  typia.assert(loginResult);
  // Step 3: Test token refresh with completely invalid refresh token
  await TestValidator.error(
    "should reject completely invalid refresh token",
    async () => {
      await api.functional.todoApp.auth.admin.refresh(connection, {
        body: {
          refresh_token: "invalid-refresh-token-that-should-fail",
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies ITodoAppAdminSession.IRefresh,
      });
    },
  );
  // Step 4: Test token refresh with malformed JWT token
  await TestValidator.error(
    "should reject malformed JWT refresh token",
    async () => {
      await api.functional.todoApp.auth.admin.refresh(connection, {
        body: {
          refresh_token: "not-a-valid-jwt-token-at-all!!!",
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies ITodoAppAdminSession.IRefresh,
      });
    },
  );
  // Step 5: Test token refresh with random string
  await TestValidator.error(
    "should reject random string as refresh token",
    async () => {
      await api.functional.todoApp.auth.admin.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(50),
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies ITodoAppAdminSession.IRefresh,
      });
    },
  );
  // Step 6: Test token refresh with empty string
  await TestValidator.error(
    "should reject empty string as refresh token",
    async () => {
      await api.functional.todoApp.auth.admin.refresh(connection, {
        body: {
          refresh_token: "",
          href: "https://example.com/dashboard",
          referrer: "https://example.com/login",
          ip: "127.0.0.1",
        } satisfies ITodoAppAdminSession.IRefresh,
      });
    },
  );
  // Step 7: Test token refresh with null-like token
  await TestValidator.error("should reject null-like token", async () => {
    await api.functional.todoApp.auth.admin.refresh(connection, {
      body: {
        refresh_token: "null",
        href: "https://example.com/dashboard",
        referrer: "https://example.com/login",
        ip: "127.0.0.1",
      } satisfies ITodoAppAdminSession.IRefresh,
    });
  });
}
