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
 * Test successful administrator login workflow.
 *
 * This test validates that an administrator can successfully authenticate
 * with valid credentials after account creation. The workflow includes:
 * 1. Creating an administrator account via join endpoint
 * 2. Authenticating with the same credentials via login endpoint
 * 3. Validating the complete response structure
 * 4. Verifying the token is usable for subsequent requests
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account with unique credentials
  const administratorConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinInput = {
    email,
    password,
    href,
    referrer,
  } satisfies IShoppingMallAdministrator.IJoin;
  // Create account using utility function
  const joinResult = await authorize_administrator_join(
    administratorConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinResult);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email,
    password,
    href,
    referrer,
  } satisfies IShoppingMallAdministrator.ILogin;
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // Step 3: Validate business logic (not types - typia.assert handles all type validation)
  TestValidator.equals("email matches input", loginResult.email, email);
  TestValidator.predicate(
    "grade is valid",
    loginResult.grade === "regular" || loginResult.grade === "super",
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
  // Step 4: Verify token is usable (connection headers should be updated by utility function)
  TestValidator.predicate(
    "connection has authorization header after login",
    loginConnection.headers?.Authorization !== undefined &&
      String(loginConnection.headers.Authorization).length > 0,
  );
}