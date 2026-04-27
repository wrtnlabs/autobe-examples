import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can successfully log in with valid credentials.
 *
 * Validates the complete super administrator authentication flow from account creation through login. First, a test super administrator account is created via the join endpoint (promoting an underlying regular administrator). Then, the same credentials are used to log in, and the response is validated for correct structure, matching email, super grade level, and proper authorization token fields.
 *
 * Also verifies that a session was established by checking that the login connection has been updated with an Authorization header containing the access token, enabling subsequent authenticated requests to protected super administrator endpoints.
 *
 * 1. Create a super administrator account with known credentials.
 * 2. Login using those same credentials.
 * 3. Validate login response matches expected values.
 */
export async function test_api_super_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super administrator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_administrator_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with the created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_administrator_login(
    loginConnection,
    {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IECommerceMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(loginResult);
  // Step 3: Validate business logic
  TestValidator.equals("email matches input", loginResult.email, email);
  TestValidator.equals(
    "administrator grade is super",
    loginResult.administrator.grade,
    "super",
  );
  TestValidator.predicate(
    "has non-empty access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has non-empty refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    typeof loginResult.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    typeof loginResult.token.refreshable_until === "string",
  );
  // Step 4: Verify session was created by checking Authorization header was set
  TestValidator.predicate(
    "Authorization header set after login",
    typeof loginConnection.headers?.Authorization === "string" &&
      loginConnection.headers.Authorization.length > 0,
  );
}
