import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator registration password complexity enforcement.
 *
 * This test validates that weak passwords are rejected during administrator
 * account creation. Since password reset token validation requires email access
 * (which E2E tests cannot intercept), we test password complexity requirements
 * during the registration flow instead.
 *
 * Test workflow:
 *
 * 1. Attempt registration with password without uppercase letters - should fail
 * 2. Attempt registration with password without lowercase letters - should fail
 * 3. Attempt registration with password without numbers - should fail
 * 4. Attempt registration with password without special characters - should fail
 * 5. Attempt registration with password shorter than 8 characters - should fail
 * 6. Verify successful registration with strong password meeting all requirements
 */
export async function test_api_administrator_password_reset_completion_weak_password_rejection(
  connection: api.IConnection,
) {
  // Generate unique test data for each attempt
  const baseUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const baseEmail = typia.random<string & tags.Format<"email">>();

  // Test 1: Password without uppercase letters
  await TestValidator.error(
    "registration with password lacking uppercase should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          username: (baseUsername + "1") satisfies string as string,
          email: ("test1_" + baseEmail) satisfies string as string,
          password: "weakpass123!",
        } satisfies IDiscussionBoardAdministrator.ICreate,
      });
    },
  );

  // Test 2: Password without lowercase letters
  await TestValidator.error(
    "registration with password lacking lowercase should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          username: (baseUsername + "2") satisfies string as string,
          email: ("test2_" + baseEmail) satisfies string as string,
          password: "WEAKPASS123!",
        } satisfies IDiscussionBoardAdministrator.ICreate,
      });
    },
  );

  // Test 3: Password without numbers
  await TestValidator.error(
    "registration with password lacking numbers should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          username: (baseUsername + "3") satisfies string as string,
          email: ("test3_" + baseEmail) satisfies string as string,
          password: "WeakPassword!",
        } satisfies IDiscussionBoardAdministrator.ICreate,
      });
    },
  );

  // Test 4: Password without special characters
  await TestValidator.error(
    "registration with password lacking special characters should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          username: (baseUsername + "4") satisfies string as string,
          email: ("test4_" + baseEmail) satisfies string as string,
          password: "WeakPass123",
        } satisfies IDiscussionBoardAdministrator.ICreate,
      });
    },
  );

  // Test 5: Password shorter than 8 characters
  await TestValidator.error(
    "registration with password shorter than 8 characters should fail",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          username: (baseUsername + "5") satisfies string as string,
          email: ("test5_" + baseEmail) satisfies string as string,
          password: "Weak1!",
        } satisfies IDiscussionBoardAdministrator.ICreate,
      });
    },
  );

  // Test 6: Verify successful registration with strong password
  const strongPassword = "SecurePass123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      username: (baseUsername + "6") satisfies string as string,
      email: ("test6_" + baseEmail) satisfies string as string,
      password: strongPassword,
    } satisfies IDiscussionBoardAdministrator.ICreate,
  });
  typia.assert(admin);
}
