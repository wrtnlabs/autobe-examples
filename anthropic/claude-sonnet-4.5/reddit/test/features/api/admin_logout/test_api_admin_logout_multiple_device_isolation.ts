import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

export async function test_api_admin_logout_multiple_device_isolation(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account (creates first session automatically)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!@#";

  const registrationBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  const firstSession: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });
  typia.assert(firstSession);

  // After join, connection.headers.Authorization is automatically set to first session token
  const firstSessionToken = firstSession.token.access;

  // Step 2: Create second session by logging in again (simulating second device)
  // Create a fresh connection for second session
  const secondSessionConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const secondSession: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.login(secondSessionConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ILogin,
    });
  typia.assert(secondSession);

  // After login, secondSessionConnection.headers.Authorization is automatically set
  const secondSessionToken = secondSession.token.access;

  // Step 3: Create third session (simulating third device)
  const thirdSessionConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const thirdSession: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.login(thirdSessionConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditLikeAdmin.ILogin,
    });
  typia.assert(thirdSession);

  const thirdSessionToken = thirdSession.token.access;

  // Validate that all three sessions have different tokens
  TestValidator.predicate(
    "first and second session tokens are different",
    firstSessionToken !== secondSessionToken,
  );
  TestValidator.predicate(
    "second and third session tokens are different",
    secondSessionToken !== thirdSessionToken,
  );
  TestValidator.predicate(
    "first and third session tokens are different",
    firstSessionToken !== thirdSessionToken,
  );

  // Step 4: Logout from the second session only
  const logoutResponse: IRedditLikeAdmin.ILogoutResponse =
    await api.functional.auth.admin.logout(secondSessionConnection);
  typia.assert(logoutResponse);
  TestValidator.equals("logout success flag", logoutResponse.success, true);

  // Step 5: Verify the second session token is now invalid
  // The logged-out session should no longer be able to perform authenticated operations
  await TestValidator.error(
    "logged out session token should be invalid",
    async () => {
      await api.functional.auth.admin.logout(secondSessionConnection);
    },
  );

  // Step 6: Verify first session is still active and functional
  // We test this by successfully performing logout (which proves authentication works)
  const firstSessionLogoutResponse: IRedditLikeAdmin.ILogoutResponse =
    await api.functional.auth.admin.logout(connection);
  typia.assert(firstSessionLogoutResponse);
  TestValidator.equals(
    "first session successfully logged out proving it was still active",
    firstSessionLogoutResponse.success,
    true,
  );

  // Step 7: Verify third session is still active and functional
  const thirdSessionLogoutResponse: IRedditLikeAdmin.ILogoutResponse =
    await api.functional.auth.admin.logout(thirdSessionConnection);
  typia.assert(thirdSessionLogoutResponse);
  TestValidator.equals(
    "third session successfully logged out proving it was still active",
    thirdSessionLogoutResponse.success,
    true,
  );
}
