import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministratorLoginRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorLoginRequest";
import type { IAdministratorRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministratorRegistrationRequest";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import type { ITokenRefreshRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITokenRefreshRequest";

export async function test_api_administrator_token_refresh_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Register a new administrator account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = "TestPass123!Admin"; // Meets security requirements: 8+ chars, mixed case, digit, special char

  const registered = await api.functional.auth.administrator.join(connection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
    } satisfies IAdministratorRegistrationRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registration successful",
    registered.email,
    registrationEmail,
  );

  // Step 2: Login to obtain refresh token
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
  TestValidator.equals(
    "login successful",
    loginResponse.email,
    registrationEmail,
  );

  const refreshToken = loginResponse.token.refresh;
  TestValidator.predicate("refresh token obtained", refreshToken.length > 0);

  // Step 3: Make rapid consecutive refresh requests to trigger rate limiting
  let successCount = 0;
  let rateLimitHit = false;
  const maxAttempts = 120; // Try up to 120 times to exceed rate limit

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const refreshResponse = await api.functional.auth.administrator.refresh(
        connection,
        {
          body: {
            refresh_token: refreshToken,
          } satisfies ITokenRefreshRequest,
        },
      );
      typia.assert(refreshResponse);
      successCount++;
    } catch (error) {
      // Check if it's an HTTP 429 error (rate limit exceeded)
      if (error instanceof api.HttpError && error.status === 429) {
        rateLimitHit = true;
        break;
      }
      // Re-throw other errors
      throw error;
    }
  }

  // Step 4: Verify that rate limiting is enforced
  TestValidator.predicate(
    "rate limiting is enforced after excessive requests",
    rateLimitHit === true,
  );

  // Step 5: Verify that at least some requests succeeded before hitting the limit
  TestValidator.predicate(
    "initial refresh requests succeed before rate limit",
    successCount > 0,
  );

  // Step 6: Attempt additional refresh request to confirm rate limit is active
  await TestValidator.error(
    "subsequent refresh after rate limit should fail with 429",
    async () => {
      await api.functional.auth.administrator.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies ITokenRefreshRequest,
      });
    },
  );
}
