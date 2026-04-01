import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator authentication with valid credentials.
 *
 * This test verifies the complete administrator login workflow:
 * 1. Register a new administrator account with valid credentials
 * 2. Login using the registered credentials
 * 3. Validate the response contains all required fields
 * 4. Verify the administrator identity matches between registration and login
 * 5. Confirm the authorization tokens are properly structured
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_administrator_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate administrator identity matches between registration and login
  TestValidator.equals(
    "administrator ID matches",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals("email matches", loginResult.email, adminEmail);
  TestValidator.equals(
    "deletedAt is null for active account",
    loginResult.deletedAt,
    null,
  );
  // Step 4: Verify token temporal relationship (business logic, not type validation)
  const expiredAtDate = new Date(loginResult.token.expired_at);
  const refreshableUntilDate = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
}
