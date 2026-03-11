import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
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
  // Create admin account first with stored credentials
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IMultiUserTodoAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // Attempt login with the original credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinCredentials.email,
      password: joinCredentials.password,
    } satisfies IMultiUserTodoAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate response structure
  TestValidator.equals("admin ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(loginResult.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(loginResult.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.equals("deleted_at is null", loginResult.deleted_at, null);
  // Validate token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => new Date(loginResult.token.expired_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () =>
      new Date(loginResult.token.refreshable_until).toString() !==
      "Invalid Date",
  );
  // Validate token expiration logic
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    expiredAt < refreshableUntil,
  );
  // Verify utility functions properly set connection headers internally
  TestValidator.predicate(
    "admin connection has authorization header",
    adminConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "login connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
}
