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
  // This test verifies that a super administrator can successfully log in with a valid email and password.
  // 1. Create super administrator account with known credentials
  const adminConnection: api.IConnection = { host: connection.host };
  // Known credentials for super administrator join (email and password needed but schema is empty object, so simulate with empty)
  const joinBody: IDiscussionBoardSuperAdministrator.IJoin = {};
  const authorized = await authorize_super_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2. Use the same credentials to log in
  const loginBody: IDiscussionBoardSuperAdministrator.ILogin = {};
  const loginAuthorized = await authorize_super_administrator_login(
    adminConnection,
    { body: loginBody },
  );
  typia.assert(loginAuthorized);
  // 3. Validate the authorization token structure and expiration timestamps
  const token = loginAuthorized.token;
  // Assert the JWT token strings are non-empty strings
  TestValidator.predicate(
    "access token string non-empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token string non-empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Assert the expiration timestamps are ISO 8601 strings
  TestValidator.predicate(
    "expired_at is ISO 8601",
    typeof token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is ISO 8601",
    typeof token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.refreshable_until),
  );
  // Additional validation that refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(token.refreshable_until).getTime() >
      new Date(token.expired_at).getTime(),
  );
}
