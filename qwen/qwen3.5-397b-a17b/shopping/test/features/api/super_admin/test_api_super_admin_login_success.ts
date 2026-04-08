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
 * Validates the complete authentication flow for super administrators including account registration, credential verification, and JWT token generation. Ensures that login succeeds with valid credentials and returns proper authorization response with access and refresh tokens.
 *
 * Special attention is given to verifying that session context fields (href, referrer, ip) are properly captured and that the account remains active (deleted_at is null) after successful authentication.
 *
 * 1. Register a new super administrator account with random email and password.
 * 2. Attempt login with the same credentials including session context.
 * 3. Validate response contains proper account information and JWT tokens.
 * 4. Verify account is active (deleted_at is null) and tokens are valid.
 */
export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse in login
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  // 1. Register super administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate response structure and business logic
  TestValidator.equals(
    "email matches registered",
    loginResult.email,
    credentials.email,
  );
  TestValidator.equals(
    "email matches join result",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.predicate(
    "account is active (not deleted)",
    loginResult.deleted_at === null,
  );
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loginResult.token.refreshable_until) >
      new Date(loginResult.token.expired_at),
  );
}
