import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_systemadministrator_refresh_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAccount =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Login to obtain fresh tokens
  const loginResponse =
    await api.functional.auth.systemAdministrator.login.signIn(connection, {
      body: {
        email: adminEmail,
        password: "1234", // Default password for new accounts
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IEconPoliticalDiscussionUser.ILogin,
    });
  typia.assert(loginResponse);

  // Step 3: Verify we have valid token information
  const initialTokens = loginResponse.token;
  TestValidator.equals(
    "login should provide access token",
    initialTokens.access.length > 0,
    true,
  );
  TestValidator.equals(
    "login should provide refresh token",
    initialTokens.refresh.length > 0,
    true,
  );

  // Extract the refresh token expiry time to simulate expiry
  const refreshExpiryTime = new Date(initialTokens.refreshable_until);
  TestValidator.predicate(
    "refresh token should have future expiry",
    refreshExpiryTime.getTime() > Date.now(),
  );

  // Step 4: Simulate token expiry by waiting past the refresh expiry time
  const waitTime = refreshExpiryTime.getTime() - Date.now() + 1000; // Add 1 second buffer
  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Step 5: Attempt to refresh the expired token and verify error handling
  await TestValidator.error(
    "expired refresh token should be rejected",
    async () => {
      await api.functional.auth.systemAdministrator.refresh.renew(connection);
    },
  );
}
