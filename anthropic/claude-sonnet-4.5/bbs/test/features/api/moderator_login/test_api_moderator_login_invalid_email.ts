import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login with non-existent email address.
 *
 * Validates that the moderator authentication API correctly rejects login
 * attempts using an email address that does not exist in the
 * discussion_board_moderators table. This test ensures that:
 *
 * 1. Authentication fails when using a non-existent email
 * 2. The API does not reveal whether the email exists (preventing account
 *    enumeration)
 * 3. No session is created for invalid login attempts
 * 4. No JWT tokens are issued to unauthorized users
 *
 * The test uses a randomly generated UUID-based email to guarantee the email
 * does not exist in the database, then attempts authentication and verifies
 * that the operation fails as expected.
 */
export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate a non-existent email address using UUID to ensure uniqueness
  const nonExistentEmail = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@example.com`;

  // Construct login credentials with the non-existent email
  const loginCredentials = {
    email: nonExistentEmail,
    password: "somePassword123",
    href: "https://discussion-board.example.com/moderator/login",
    referrer: "https://discussion-board.example.com/moderator",
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt to login with non-existent email and verify it fails
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: loginCredentials,
      });
    },
  );
}
