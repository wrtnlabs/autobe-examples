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
 * Test successful administrator login with valid credentials.
 *
 * Validates the complete administrator authentication flow including account registration and login. Ensures that new administrators are created with default 'regular' grade and unbanned status, and that successful login returns proper JWT tokens with correct expiration timestamps.
 *
 * Special attention is given to verifying that the registered email matches the authenticated email, the grade is set to 'regular' for new administrators, and the banned flag is false by default.
 *
 * 1. Register a new administrator account with valid email and password.
 * 2. Log in with the same credentials used during registration.
 * 3. Validate the response contains all required fields including UUID, email, grade, banned status, and tokens.
 * 4. Verify the email matches the registered email.
 * 5. Verify the grade is 'regular' for newly registered administrators.
 * 6. Verify the banned flag is false.
 * 7. Verify tokens are present with valid expiration timestamps.
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const registeredEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_administrator_join(adminConnection, {
    body: {
      email: registeredEmail,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // 2. Log in with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: registeredEmail,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate response contains all required fields
  TestValidator.predicate("has administrator id", loginResult.id !== undefined);
  // 4. Verify email matches registered email
  TestValidator.equals(
    "email matches registered",
    loginResult.email,
    registeredEmail,
  );
  // 5. Verify grade is 'regular' for newly registered administrators
  TestValidator.equals("grade is regular", loginResult.grade, "regular");
  // 6. Verify banned flag is false
  TestValidator.equals("banned is false", loginResult.banned, false);
  // 7. Verify tokens are present with valid expiration timestamps
  TestValidator.predicate(
    "has access token",
    loginResult.token.access !== undefined &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh !== undefined &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    loginResult.token.refreshable_until !== undefined,
  );
  // Verify expired_at is in the future (access token expires in 15 minutes)
  const expiredAt = new Date(loginResult.token.expired_at);
  TestValidator.predicate("expired_at is in future", expiredAt > new Date());
  // Verify refreshable_until is in the future (refresh token expires in 7 days)
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > new Date(),
  );
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
  // Verify created_at and updated_at timestamps exist
  TestValidator.predicate(
    "has created_at",
    loginResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at",
    loginResult.updated_at !== undefined,
  );
  // Verify deleted_at is null (account is active)
  TestValidator.equals("deleted_at is null", loginResult.deleted_at, null);
}
