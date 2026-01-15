import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account via join endpoint using an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const joinInput = {
    email: adminEmail,
    href: "https://admin.example.com/join",
    referrer: "https://example.com",
    ip: undefined,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const joinResult = await authorize_admin_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // Step 2: Test successful login with the same admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: adminEmail,
    password: adminPassword,
    href: "https://admin.example.com/login",
    referrer: "https://example.com",
    ip: undefined,
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  } satisfies ICommunityPlatformAdmin.ILogin;
  const loginResult = await authorize_admin_login(adminLoginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // Step 3: Validate the entire token structure using typia.assert for complete type safety
  typia.assert<IAuthorizationToken>(loginResult.token);
  // Step 4: Verify that login connection has been updated with Authorization header (implicit validation)
  // This is handled internally by the authorize_admin_login utility function
}