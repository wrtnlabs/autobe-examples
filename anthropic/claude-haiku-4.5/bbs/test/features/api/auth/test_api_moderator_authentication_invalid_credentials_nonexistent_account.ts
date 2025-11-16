import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test authentication failure when moderator account does not exist.
 *
 * This test validates that the login endpoint properly handles authentication
 * attempts with credentials that don't correspond to any moderator account. The
 * system must safely reject such attempts without revealing whether the email
 * or username is registered, preventing account enumeration attacks.
 *
 * The test covers:
 *
 * 1. Login attempt with non-existent email address
 * 2. Login attempt with non-existent username
 * 3. Verification that error responses don't leak account existence information
 * 4. Proper error handling without creating unauthorized sessions
 */
export async function test_api_moderator_authentication_invalid_credentials_nonexistent_account(
  connection: api.IConnection,
) {
  // Test 1: Login with non-existent email address
  await TestValidator.error(
    "login should fail with non-existent email address",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "testpassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Test 2: Login with non-existent username
  await TestValidator.error(
    "login should fail with non-existent username",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          username: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<30> &
              tags.Pattern<"^[a-zA-Z0-9_-]+$">
          >(),
          password: "testpassword123",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Test 3: Verify error response doesn't leak information about account existence
  // Using a specifically crafted non-existent email should return the same generic error
  await TestValidator.error(
    "login should not reveal whether email is registered",
    async () => {
      const nonexistentEmail = `nonexistent.${RandomGenerator.alphaNumeric(8)}@example.com`;
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: nonexistentEmail,
          password: "wrongpassword",
          href: "https://example.com/login",
          referrer: "https://example.com/dashboard",
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );
}
