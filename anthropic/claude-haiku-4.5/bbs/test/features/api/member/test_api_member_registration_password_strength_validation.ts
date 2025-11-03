import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test password strength validation during member registration.
 *
 * The registration endpoint validates password requirements to ensure account
 * security:
 *
 * - Minimum 8 characters in length
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 *
 * This test validates:
 *
 * 1. Successful registration with a valid strong password
 * 2. Registration failure when password is too short (< 8 characters)
 * 3. Registration failure when password lacks uppercase letter
 * 4. Registration failure when password lacks lowercase letter
 * 5. Registration failure when password lacks numeric digit
 * 6. Successful registration with a different valid email and strong password
 */
export async function test_api_member_registration_password_strength_validation(
  connection: api.IConnection,
) {
  // Test 1: Successful registration with valid strong password
  // Password meets all requirements: 8+ chars, uppercase, lowercase, number
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const validPassword1 = "ValidPass123";

  const response1: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: validEmail1,
        password: validPassword1,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(response1);
  TestValidator.equals(
    "registered member email matches input",
    response1.email,
    validEmail1,
  );

  // Test 2: Registration failure - password too short (< 8 characters)
  // Password: "Pass12" (6 characters) - fails minimum length requirement
  const invalidEmail2 = typia.random<string & tags.Format<"email">>();
  const shortPassword = "Pass12";

  await TestValidator.error(
    "password too short should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: invalidEmail2,
          password: shortPassword,
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Test 3: Registration failure - password missing uppercase letter
  // Password: "validpass123" - lowercase letters, numbers, but no uppercase
  const invalidEmail3 = typia.random<string & tags.Format<"email">>();
  const noUppercasePassword = "validpass123";

  await TestValidator.error(
    "password without uppercase letter should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: invalidEmail3,
          password: noUppercasePassword,
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Test 4: Registration failure - password missing lowercase letter
  // Password: "VALIDPASS123" - uppercase letters and numbers, but no lowercase
  const invalidEmail4 = typia.random<string & tags.Format<"email">>();
  const noLowercasePassword = "VALIDPASS123";

  await TestValidator.error(
    "password without lowercase letter should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: invalidEmail4,
          password: noLowercasePassword,
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Test 5: Registration failure - password missing numeric digit
  // Password: "ValidPassword" - mixed case but no numbers
  const invalidEmail5 = typia.random<string & tags.Format<"email">>();
  const noNumberPassword = "ValidPassword";

  await TestValidator.error(
    "password without numeric digit should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: invalidEmail5,
          password: noNumberPassword,
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Test 6: Successful registration with another valid strong password
  // Verify that multiple valid registrations can succeed with different emails
  const validEmail6 = typia.random<string & tags.Format<"email">>();
  const validPassword6 = "AnotherValid456";

  const response6: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: validEmail6,
        password: validPassword6,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(response6);
  TestValidator.equals(
    "second registered member email matches input",
    response6.email,
    validEmail6,
  );
}
