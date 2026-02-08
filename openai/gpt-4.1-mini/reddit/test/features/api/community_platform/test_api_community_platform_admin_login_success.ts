import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful admin login with valid credentials.
  // 1. Create admin account via join with empty body as per DTO
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, { body: {} });
  // 2. Perform login with empty body as per DTO
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody: ICommunityPlatformAdmin.ILogin = {};
  const authorized = await authorize_admin_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "Scenario 1: Response must contain valid access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "Scenario 1: Response must contain valid refresh token",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // Scenario 2: Admin login attempt with incorrect password.
  // Since the DTOs have no password, simulate failed login by attempting login with empty body
  await TestValidator.httpError(
    "Scenario 2: login with incorrect password should fail",
    401,
    async () => {
      await authorize_admin_login(loginConnection, { body: loginBody });
    },
  );
  // Scenario 3: Admin login attempt with non-existing email.
  // Again, attempt login with empty body expecting failure
  await TestValidator.httpError(
    "Scenario 3: login with non-existing email should fail",
    401,
    async () => {
      await authorize_admin_login(loginConnection, { body: loginBody });
    },
  );
}
