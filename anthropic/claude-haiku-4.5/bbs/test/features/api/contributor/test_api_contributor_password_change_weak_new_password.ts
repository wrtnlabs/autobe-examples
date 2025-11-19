import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Test password change validation with weak new passwords.
 *
 * This test validates that the password change endpoint properly enforces
 * security requirements for new passwords. Contributor accounts must maintain
 * password security standards: minimum 8 characters with uppercase, lowercase,
 * number, and special character. When attempting to change password with weak
 * new passwords that fail these requirements, the operation should fail with
 * appropriate validation errors.
 *
 * Test flow:
 *
 * 1. Create and authenticate a contributor account
 * 2. Attempt password changes with various weak passwords
 * 3. Verify each weak password attempt fails with validation error
 * 4. Confirm weak password submissions are rejected consistently
 */
export async function test_api_contributor_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // 1. Create and authenticate a contributor account
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = "SecurePass123!";

  const contributor = await api.functional.auth.contributor.join(connection, {
    body: {
      email: email,
      username: RandomGenerator.alphabets(10),
      password: originalPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor created with active status",
    contributor.account_status,
    "active",
  );

  // 2. Attempt password changes with various weak passwords
  // Test case 1: Password too short (less than 8 characters)
  await TestValidator.error(
    "should reject password shorter than 8 characters",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "Short1!",
            password_confirmation: "Short1!",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Test case 2: Missing uppercase letter
  await TestValidator.error(
    "should reject password missing uppercase letter",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "lowercase123!",
            password_confirmation: "lowercase123!",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Test case 3: Missing lowercase letter
  await TestValidator.error(
    "should reject password missing lowercase letter",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "UPPERCASE123!",
            password_confirmation: "UPPERCASE123!",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Test case 4: Missing number
  await TestValidator.error(
    "should reject password missing number",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "NoNumbers!",
            password_confirmation: "NoNumbers!",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );

  // Test case 5: Missing special character
  await TestValidator.error(
    "should reject password missing special character",
    async () => {
      await api.functional.discussionBoard.contributor.profile.change_password.changePassword(
        connection,
        {
          body: {
            current_password: originalPassword,
            new_password: "NoSpecial123",
            password_confirmation: "NoSpecial123",
          } satisfies IDiscussionBoardContributor.IChangePassword,
        },
      );
    },
  );
}
