import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator to test login
  const baseConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_super_administrator_join(baseConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorized);
  // 2. Login with the registered super administrator email and password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    loginConnection,
    {
      body: {
        email: authorized.email,
        password,
      } satisfies IDiscussionBoardSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
  // 3. Validate login result fields
  TestValidator.predicate(
    "valid access token format",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "valid refresh token format",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.split(".").length === 3,
  );
  // 4. Validate token expiration data
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is ISO date string in the future",
    !isNaN(expiredAt.getTime()) && expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date string and after expired_at",
    !isNaN(refreshableUntil.getTime()) &&
      refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 5. Validate user data
  TestValidator.predicate(
    "id is non-empty string",
    typeof loginResult.id === "string" && loginResult.id.length > 0,
  );
  TestValidator.equals("email matches login input", loginResult.email, email);
  TestValidator.predicate(
    "displayName is non-empty string",
    typeof loginResult.displayName === "string" &&
      loginResult.displayName.length > 0,
  );
  TestValidator.predicate(
    "bio is string or null",
    loginResult.bio === null || typeof loginResult.bio === "string",
  );
  TestValidator.predicate(
    "createdAt is valid ISO string",
    !isNaN(new Date(loginResult.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO string",
    !isNaN(new Date(loginResult.updatedAt).getTime()),
  );
  TestValidator.predicate(
    "deletedAt is null or valid ISO string",
    loginResult.deletedAt === null ||
      !isNaN(new Date(loginResult.deletedAt!).getTime()),
  );
  // 6. Confirm Authorization header for follow-up requests
  TestValidator.predicate(
    "Authorization header is set after login",
    !!loginConnection.headers?.Authorization,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    loginConnection.headers!.Authorization,
    loginResult.token.access,
  );
}
