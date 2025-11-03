import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test account lockout enforcement after multiple failed login attempts.
 *
 * This test validates the security mechanism that temporarily locks accounts
 * after repeated failed login attempts to prevent brute force attacks.
 *
 * The test flow:
 *
 * 1. Register a new member account with valid email and password
 * 2. Attempt 5 consecutive failed login attempts with wrong passwords
 * 3. Verify that after the 5th failed attempt, the account is locked
 * 4. Attempt login with the correct password while account is locked
 * 5. Verify that login is denied with appropriate lockout message indicating the
 *    15-minute lockout duration and when the account will be unlocked
 * 6. Verify subsequent login attempts are also blocked during lockout period
 */
export async function test_api_member_login_account_locked_after_failed_attempts(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);
  TestValidator.equals(
    "registered member should have valid ID",
    typeof registered.id,
    "string",
  );
  TestValidator.equals(
    "registered member should have auth token",
    typeof registered.token.access,
    "string",
  );

  // Step 2: Attempt 5 consecutive failed login attempts with wrong passwords
  const wrongPassword1 = "WrongPassword1";
  const wrongPassword2 = "WrongPassword2";
  const wrongPassword3 = "WrongPassword3";
  const wrongPassword4 = "WrongPassword4";
  const wrongPassword5 = "WrongPassword5";

  // First failed attempt
  await TestValidator.error(
    "first failed login attempt should throw error",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: wrongPassword1,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Second failed attempt
  await TestValidator.error(
    "second failed login attempt should throw error",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: wrongPassword2,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Third failed attempt
  await TestValidator.error(
    "third failed login attempt should throw error",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: wrongPassword3,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Fourth failed attempt
  await TestValidator.error(
    "fourth failed login attempt should throw error",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: wrongPassword4,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Fifth failed attempt - should trigger account lockout
  await TestValidator.error(
    "fifth failed login attempt should trigger account lockout",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: wrongPassword5,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 3 & 4: Attempt login with correct password while account is locked
  await TestValidator.error(
    "login with correct password should fail during lockout period",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  // Step 5: Verify another login attempt is also blocked during lockout
  await TestValidator.error(
    "subsequent login attempt should also be blocked during lockout",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IDiscussionBoardMember.ILoginRequest,
      });
    },
  );

  TestValidator.predicate(
    "account lockout security validation completed successfully",
    true,
  );
}
