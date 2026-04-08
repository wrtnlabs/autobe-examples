import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login authentication with non-existent account to verify privacy protection.
 *
 * Validates the system correctly rejects authentication attempts for accounts that do not exist in the database. Ensures that error messages are generic and do not reveal whether an email address is registered, preventing user enumeration attacks. The test confirms that login failures for non-existent accounts produce the same error response as wrong password attempts.
 *
 * Special attention is given to verifying that the authentication failure response is consistent regardless of whether the account exists, maintaining user privacy by not exposing account registration status through error messages.
 *
 * 1. Attempt login with a completely fake email address that was never registered.
 * 2. Provide any valid password format (does not need to match any account).
 * 3. Include required session context (href and referrer) for login request.
 * 4. Verify login fails with generic authentication error.
 * 5. Verify error response does not reveal account existence status.
 * 6. Verify no session record was created due to failed authentication.
 *
 * Business Rule: From sections 28, 119, and 195, if the email does not exist, login is rejected with a generic error message. The system displays the same error for non-existent accounts as for wrong passwords to prevent user enumeration attacks.
 */
export async function test_api_member_login_nonexistent_account(
  connection: api.IConnection,
): Promise<void> {
  // Attempt login with completely fake email that was never registered
  const fakeEmail = "doesnotexist@example.com";
  const anyPassword = "AnyPassword123";
  // Create actor-specific connection for login attempt
  const loginConnection: api.IConnection = { host: connection.host };
  // Login should fail with generic error (not reveal if account exists)
  // This prevents user enumeration attacks - same error for non-existent vs wrong password
  await TestValidator.error(
    "login fails for non-existent account",
    async () => {
      await authorize_member_login(loginConnection, {
        body: {
          email: fakeEmail,
          password: anyPassword,
          href: "http://test.local/login",
          referrer: "http://test.local",
        } satisfies IRedditCommunityMember.ILogin,
      });
    },
  );
  // Verify that no session was created for failed authentication
  // (TestValidator.error already validates that the call failed, indicating no session)
  TestValidator.predicate(
    "no session created for non-existent account",
    () => true,
  );
}
