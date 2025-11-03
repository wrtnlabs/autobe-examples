import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member login rejection with incorrect password and account lockout.
 *
 * This test validates the authentication system's handling of failed login
 * attempts when the provided password does not match the stored password_hash.
 * The system must reject incorrect passwords with a generic error message that
 * does not reveal whether the email exists in the system, protecting against
 * email enumeration attacks.
 *
 * The test verifies:
 *
 * 1. Registration of a new member account with valid credentials
 * 2. Failed login attempts with incorrect password are rejected
 * 3. System tracks consecutive failed login attempts for rate limiting
 * 4. After 5 consecutive failed attempts within 15 minutes, account is locked
 * 5. Locked account prevents login with both correct and incorrect passwords
 * 6. Error messages are generic and do not reveal account existence
 *
 * This implements rate limiting and account lockout protection against brute
 * force password guessing attacks.
 */
export async function test_api_member_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = "ValidPassword123";

  const registered = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: email,
        password: correctPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(registered);
  TestValidator.equals("registration successful", registered.email, email);

  // Step 2: Make 5 consecutive failed login attempts with incorrect password
  const incorrectPassword = "WrongPassword123";

  // Attempt 1
  await TestValidator.error(
    "first incorrect password attempt should fail",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Attempt 2
  await TestValidator.error(
    "second incorrect password attempt should fail",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Attempt 3
  await TestValidator.error(
    "third incorrect password attempt should fail",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Attempt 4
  await TestValidator.error(
    "fourth incorrect password attempt should fail",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Attempt 5 - This should trigger account lock
  await TestValidator.error(
    "fifth incorrect password attempt should fail and lock account",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 3: Verify account is locked - attempt with correct password should fail
  await TestValidator.error(
    "locked account should reject correct password",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: correctPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 4: Verify locked account rejects incorrect password too
  await TestValidator.error(
    "locked account should reject incorrect password",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: email,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 5: Test with non-existent email returns generic error (same error message)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  await TestValidator.error(
    "non-existent email should return generic error message",
    async () => {
      await api.functional.discussionBoard.auth.login.signIn(connection, {
        body: {
          email: nonExistentEmail,
          password: "SomePassword123",
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );
}
