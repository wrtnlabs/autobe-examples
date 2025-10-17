import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITokenRefreshRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefreshRequest";

export async function test_api_administrator_token_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = RandomGenerator.alphabets(10) + "Aa1!";

  const registered = await api.functional.auth.administrator.join(connection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
    } satisfies IAdministratorRegistrationRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered admin email matches",
    registered.email,
    registrationEmail,
  );

  // Step 2: Login as administrator to obtain tokens
  const loginResponse = await api.functional.auth.administrator.login(
    connection,
    {
      body: {
        email: registrationEmail,
        password: registrationPassword,
      } satisfies IAdministratorLoginRequest,
    },
  );
  typia.assert(loginResponse);

  const refreshToken = loginResponse.token.refresh;
  TestValidator.equals(
    "token_type is Bearer",
    loginResponse.token_type,
    "Bearer",
  );
  TestValidator.equals(
    "expires_in is 900 seconds",
    loginResponse.expires_in,
    900,
  );

  // Step 3: Submit refresh token to get new access token
  const refreshResponse = await api.functional.auth.administrator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies ITokenRefreshRequest,
    },
  );
  typia.assert(refreshResponse);

  // Step 4: Validate the refresh response
  TestValidator.equals(
    "new token_type is Bearer",
    refreshResponse.token_type,
    "Bearer",
  );
  TestValidator.equals(
    "new expires_in is 900 seconds",
    refreshResponse.expires_in,
    900,
  );
  TestValidator.equals(
    "refreshed email matches original",
    refreshResponse.email,
    registrationEmail,
  );
  TestValidator.equals(
    "refreshed admin level matches",
    refreshResponse.admin_level,
    loginResponse.admin_level,
  );

  // Step 5: Verify token structure
  TestValidator.predicate(
    "refreshed token has access token",
    !!refreshResponse.token.access,
  );
  TestValidator.predicate(
    "refreshed token has refresh token",
    !!refreshResponse.token.refresh,
  );
  TestValidator.predicate(
    "access token is different from refresh token",
    refreshResponse.token.access !== refreshResponse.token.refresh,
  );

  // Step 6: Verify administrator information is preserved
  TestValidator.equals(
    "admin id matches",
    refreshResponse.id,
    loginResponse.id,
  );
}
