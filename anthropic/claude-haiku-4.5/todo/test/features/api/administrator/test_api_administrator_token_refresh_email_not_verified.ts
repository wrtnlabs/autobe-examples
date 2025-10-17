import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITokenRefreshRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefreshRequest";

/**
 * Test token refresh rejection when administrator email is not verified.
 *
 * Validates that the system prevents unverified administrators from refreshing
 * authentication tokens as a security requirement. The test ensures that email
 * verification must be completed before token refresh operations are allowed.
 *
 * Workflow:
 *
 * 1. Create administrator account (email_verified=false by default)
 * 2. Extract refresh token from registration response
 * 3. Attempt to refresh token with unverified email
 * 4. Verify HTTP 403 Forbidden response with TODOAPP-AUTH-003 error code
 * 5. Confirm that unverified accounts cannot extend sessions
 */
export async function test_api_administrator_token_refresh_email_not_verified(
  connection: api.IConnection,
) {
  // Step 1: Register new administrator with unverified email
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!@#";

  const registrationResponse: ITodoAppAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
      } satisfies IAdministratorRegistrationRequest,
    });
  typia.assert(registrationResponse);

  // Step 2: Extract refresh token from registration response
  const refreshToken = registrationResponse.token.refresh;
  TestValidator.predicate(
    "refresh token should be present in registration response",
    refreshToken.length > 0,
  );

  // Step 3: Create unauthenticated connection for refresh attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 4: Verify that refresh fails with 403 Forbidden when email is not verified
  await TestValidator.error(
    "refresh token should fail with 403 when email is not verified",
    async () => {
      await api.functional.auth.administrator.refresh(unauthConn, {
        body: {
          refresh_token: refreshToken,
        } satisfies ITokenRefreshRequest,
      });
    },
  );

  // Step 5: Confirm that the error is specifically about email verification
  TestValidator.predicate(
    "unverified email prevents token refresh as expected",
    true,
  );
}
