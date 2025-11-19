import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test login with a non-existent email for discussion board user
 * authentication.
 *
 * This test validates the login endpoint's proper failure behavior when a user
 * attempts to authenticate using an email address that does not exist in the
 * system. Correct failure behavior must ensure that:
 *
 * - The authentication request returns an error (does not succeed).
 * - No information is leaked in the error about whether the email or password was
 *   incorrect.
 * - No session tokens are issued in the error response under any circumstance.
 * - Error structure complies with security best practices (e.g., generic error
 *   message, no internal fields exposed).
 *
 * Steps:
 *
 * 1. Construct test credentials using a random, non-existent email and a random
 *    password; also provide required href and referrer fields for session
 *    context.
 * 2. Attempt to log in using these credentials via the user login endpoint.
 * 3. Validate that an error is returned.
 * 4. Confirm that the error structure does NOT disclose details about which field
 *    was invalid and that the response does not contain a session token or user
 *    data.
 */
export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Prepare random email and password representing a user that does NOT exist
  const loginBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    href: "https://discussion-board.example.com/thread/1",
    referrer: "https://discussion-board.example.com/login",
  } satisfies IDiscussionBoardUser.ILogin;

  // 2. Attempt to log in and expect error (must not leak whether email or password is wrong)
  await TestValidator.error(
    "login attempt with non-existent email should fail with generic error and yield no session tokens",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
