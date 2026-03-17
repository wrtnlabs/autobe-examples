import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful super administrator login with valid credentials.
 *
 * This test verifies the complete authentication flow for super administrators:
 * 1. Create a new super administrator account with valid credentials
 * 2. Login using the same credentials
 * 3. Validate the response contains account information and valid authorization tokens
 * 4. Verify token structure includes access, refresh, expired_at, and refreshable_until
 */
export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Validate join response structure
  typia.assert(joinResult);
  TestValidator.equals("join email matches", joinResult.email, email);
  // Step 2: Login with the created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  // Validate login response structure
  typia.assert(loginResult);
  // Step 3: Verify account information in login response
  TestValidator.equals(
    "login id matches join id",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals("login email matches", loginResult.email, email);
  // Step 4: Verify token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(loginResult.token.expired_at).getTime() > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(loginResult.token.refreshable_until).getTime() > 0,
  );
  // Step 5: Verify refreshable_until is after expired_at
  const expiredAt = new Date(loginResult.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil >= expiredAt,
  );
}
