import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful super administrator authentication with valid credentials.
 *
 * This test validates the complete authentication workflow:
 * 1. Register a new super administrator account
 * 2. Login with the registered credentials
 * 3. Verify JWT tokens and account information in response
 * 4. Confirm token structure and expiration metadata
 */
export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.IJoin;
  const joinResult = await authorize_super_administrator_join(connection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // Step 2: Create a new connection for login test
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Login with the registered credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdministrator.ILogin;
  const loginResult = await authorize_super_administrator_login(
    loginConnection,
    {
      body: loginCredentials,
    },
  );
  typia.assert(loginResult);
  // Step 4: Validate account information matches
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    joinCredentials.email,
  );
  // Step 5: Validate account is active (not soft deleted)
  TestValidator.equals("account is active", loginResult.deleted_at, null);
  // Step 6: Validate token structure
  TestValidator.predicate(
    "access token exists",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loginResult.token.refresh.length > 0,
  );
  // Step 7: Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date-time",
    () => !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    () => !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // Step 8: Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () =>
      new Date(loginResult.token.refreshable_until).getTime() >
      new Date(loginResult.token.expired_at).getTime(),
  );
  // Step 9: Validate account timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(loginResult.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(loginResult.updated_at)),
  );
  // Step 10: Validate UUID format
  TestValidator.predicate("id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResult.id,
    ),
  );
}
