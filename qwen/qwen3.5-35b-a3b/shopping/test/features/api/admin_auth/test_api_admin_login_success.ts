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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with random credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResponse);
  // Step 2: Login with created admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoinResponse.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLoginResponse);
  // Step 3: Validate admin information
  TestValidator.equals(
    "admin id is UUID",
    adminLoginResponse.id,
    adminJoinResponse.id,
  );
  TestValidator.equals(
    "email matches",
    adminLoginResponse.email,
    adminJoinResponse.email,
  );
  TestValidator.equals("is not banned", adminLoginResponse.is_banned, false);
  TestValidator.equals(
    "ban reason is null",
    adminLoginResponse.ban_reason,
    null,
  );
  TestValidator.equals(
    "created_at and updated_at are valid",
    adminLoginResponse.created_at,
    adminLoginResponse.updated_at,
  );
  // Step 4: Validate JWT tokens
  const token: IAuthorizationToken = adminLoginResponse.token;
  TestValidator.equals("access token is string", typeof token.access, "string");
  TestValidator.equals(
    "refresh token is string",
    typeof token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access expires before refresh limit",
    token.expired_at < token.refreshable_until,
  );
  TestValidator.predicate("access token is not empty", token.access.length > 0);
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );
}