import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator login after account registration.
 *
 * Validates the complete administrator authentication flow from account creation through login. Ensures that after registering an administrator account with valid credentials, those same credentials successfully authenticate and return a properly structured response with valid JWT tokens.
 *
 * Business logic validations include verifying the email matches the registered value, confirming the grade is "administrator" for a newly created account, and checking that token expiration timestamps are in the future with correct ordering (refreshable_until after expired_at). The login function sets the Authorization header on the connection, confirming the token is valid for subsequent API calls.
 *
 * 1. Register an administrator account with randomized email and password.
 * 2. Login with the same credentials on a fresh connection.
 * 3. Validate the response structure with typia.assert.
 * 4. Verify business logic: email match, grade value, token properties, expiration ordering, and connection header propagation.
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account with known credentials
  const adminConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const href: string = "https://admin-portal/login";
  const referrer: string = "https://admin-portal/";
  const joined = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(joined);
  // 2. Login with the same credentials on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IECommerceMallAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  // 3. Business logic validations
  TestValidator.equals("email matches input", loggedIn.email, email);
  TestValidator.equals(
    "grade is administrator",
    loggedIn.grade,
    "administrator",
  );
  TestValidator.equals("deleted_at is null", loggedIn.deleted_at, null);
  TestValidator.predicate(
    "access token is non-empty",
    () => loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    () => loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    () => new Date(loggedIn.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => new Date(loggedIn.token.refreshable_until).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until after expired_at",
    () =>
      new Date(loggedIn.token.refreshable_until).getTime() >
      new Date(loggedIn.token.expired_at).getTime(),
  );
  // 4. Verify the token was propagated to the connection for subsequent API calls
  TestValidator.predicate(
    "Authorization header is set on connection",
    () =>
      typeof loginConnection.headers?.Authorization === "string" &&
      loginConnection.headers!.Authorization.length > 0,
  );
}
