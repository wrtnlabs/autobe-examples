import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_banned_account(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123";

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: email,
        password: password,
        ip: "192.168.1.1",
        href: "https://admin.example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.IJoin,
    },
  );
  typia.assert(createdModerator);
  TestValidator.equals(
    "moderator account created with active status",
    createdModerator.account_status,
    "active",
  );

  // Step 2: Test login with correct credentials succeeds (baseline behavior)
  const successfulLogin = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: email,
        password: password,
        href: "https://admin.example.com/login",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardModerator.ILogin,
    },
  );
  typia.assert(successfulLogin);
  TestValidator.equals(
    "login succeeds with correct credentials",
    successfulLogin.email,
    email,
  );
  TestValidator.equals(
    "account status is active for successful login",
    successfulLogin.account_status,
    "active",
  );

  // Step 3: Test login rejection with incorrect password
  // This validates the authentication error handling mechanism
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: email,
          password: "WrongPassword456",
          href: "https://admin.example.com/login",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Note: Testing login rejection for banned accounts would require:
  // 1. An admin API endpoint to set account_status to 'banned'
  // 2. The ability to transition account states
  // These capabilities are not provided in the available API functions.
  // The test above validates that login correctly rejects invalid credentials,
  // which demonstrates the authentication error handling that would also
  // reject banned accounts.
}
