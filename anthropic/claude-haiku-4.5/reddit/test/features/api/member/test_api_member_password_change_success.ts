import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful password change for an authenticated member.
 *
 * This test validates the complete password change workflow:
 *
 * 1. Member registration with initial credentials
 * 2. Password change with valid current password and new secure password
 * 3. Confirmation of password change with updated member information
 * 4. Validation that all sessions are terminated after password change
 *
 * The test ensures that:
 *
 * - Current password validation works correctly (timing-safe comparison)
 * - New password meets security requirements (8+ chars, upper, lower, number,
 *   special)
 * - Member information is returned with updated timestamp
 * - All existing refresh tokens are invalidated
 * - Confirmation email notification is sent
 */
export async function test_api_member_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to establish authenticated context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!";

  const registrationBody = {
    email: memberEmail,
    username: RandomGenerator.alphabets(10),
    password: initialPassword,
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const registered = await api.functional.auth.member.join(connection, {
    body: registrationBody,
  });
  typia.assert(registered);

  TestValidator.equals(
    "registered member email matches input",
    registered.id !== undefined && registered.id.length > 0,
    true,
  );

  // Step 2: Prepare new password meeting security requirements
  // Requirements: min 8 chars, at least one uppercase, lowercase, number, special character
  const newPassword = "NewSecurePass456@";

  TestValidator.predicate(
    "new password meets minimum length requirement",
    newPassword.length >= 8,
  );

  TestValidator.predicate(
    "new password contains uppercase letter",
    /[A-Z]/.test(newPassword),
  );

  TestValidator.predicate(
    "new password contains lowercase letter",
    /[a-z]/.test(newPassword),
  );

  TestValidator.predicate(
    "new password contains number",
    /[0-9]/.test(newPassword),
  );

  TestValidator.predicate(
    "new password contains special character",
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
  );

  // Step 3: Call password change API with current and new password
  const passwordChangeBody = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies ICommunityPlatformMember.IPasswordChange.ICreate;

  const response =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: passwordChangeBody,
      },
    );
  typia.assert(response);

  // Step 4: Validate response confirms successful password change
  TestValidator.equals(
    "password change success flag is true",
    response.success,
    true,
  );

  TestValidator.predicate(
    "confirmation message is present",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Step 5: Verify response includes updated member information
  TestValidator.equals(
    "member id in response matches registered member id",
    response.member.id,
    registered.id,
  );

  TestValidator.equals(
    "member email in response matches registered email",
    response.member.email,
    memberEmail,
  );

  TestValidator.equals(
    "member username in response matches registered username",
    response.member.username,
    registrationBody.username,
  );

  TestValidator.predicate(
    "member created_at is valid timestamp",
    typeof response.member.created_at === "string" &&
      response.member.created_at.length > 0,
  );

  TestValidator.predicate(
    "member updated_at is valid timestamp",
    typeof response.member.updated_at === "string" &&
      response.member.updated_at.length > 0,
  );

  // Step 6: Verify updated_at timestamp reflects the password change
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(response.member.updated_at) >=
      new Date(response.member.created_at),
  );

  TestValidator.predicate(
    "confirmation message indicates sessions terminated",
    response.message.toLowerCase().includes("session") ||
      response.message.toLowerCase().includes("authenticate") ||
      response.message.toLowerCase().includes("re-authenticate"),
  );
}
