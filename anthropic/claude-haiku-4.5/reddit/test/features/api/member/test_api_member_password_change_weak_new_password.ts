import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password change rejection when new password does not meet security
 * requirements.
 *
 * This test validates that the password change endpoint properly enforces
 * password security constraints. Multiple weak password scenarios are tested to
 * ensure the API validates all security requirements: minimum length (8
 * characters), uppercase letters, lowercase letters, numbers, and special
 * characters.
 *
 * Test Process:
 *
 * 1. Create authenticated member account with secure password
 * 2. Attempt password change with 5 different weak passwords:
 *
 *    - Too short (< 8 characters)
 *    - Missing uppercase letter
 *    - Missing lowercase letter
 *    - Missing number/digit
 *    - Missing special character
 * 3. Verify each attempt fails with HTTP 400 error
 * 4. Confirm password was not changed by verifying original password still works
 * 5. Finally verify password change succeeds with a valid new password
 */
export async function test_api_member_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with a valid, secure password
  const validPassword = "SecurePassword123!";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(10);
  const memberIp = "192.168.1.1";
  const memberHref = "https://example.com/register";
  const memberReferrer = "https://example.com";

  const joinResponse = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: validPassword,
      ip: memberIp,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(joinResponse);

  // Step 2: Define weak password test cases
  const weakPasswordCases = [
    {
      password: "Short1!",
      description: "password too short (less than 8 characters)",
    },
    {
      password: "shortpassword1!",
      description: "password missing uppercase letter",
    },
    {
      password: "SHORTPASSWORD1!",
      description: "password missing lowercase letter",
    },
    {
      password: "ShortPassword!",
      description: "password missing number/digit",
    },
    {
      password: "ShortPassword1",
      description: "password missing special character",
    },
  ];

  // Step 3: Test each weak password scenario
  for (const testCase of weakPasswordCases) {
    // Attempt password change with weak password - should fail
    await TestValidator.error(
      `password change should fail: ${testCase.description}`,
      async () => {
        await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
          connection,
          {
            body: {
              current_password: validPassword,
              new_password: testCase.password,
            } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
          },
        );
      },
    );

    // Step 4: Verify password was not changed by attempting another password change
    // with the original password as current_password. If this works without error,
    // it proves the original password is still valid (i.e., password wasn't changed).
    // We'll use a different temporary valid password for this verification.
    const tempVerificationPassword = `TempPass${RandomGenerator.alphaNumeric(6)}!`;

    // This should succeed if the original password is still in effect
    const verificationAttempt =
      await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: tempVerificationPassword,
          } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
        },
      );
    typia.assert(verificationAttempt);

    // Change password back to original for next iteration
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: tempVerificationPassword,
          new_password: validPassword,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  }

  // Step 5: Final verification - attempt successful password change with valid password
  const newValidPassword = "NewPassword123!@";
  const successResponse =
    await api.functional.communityPlatform.member.auth.member.password_change.changePassword(
      connection,
      {
        body: {
          current_password: validPassword,
          new_password: newValidPassword,
        } satisfies ICommunityPlatformMember.IPasswordChange.ICreate,
      },
    );
  typia.assert(successResponse);
  TestValidator.predicate(
    "successful password change returns success status",
    successResponse.success === true,
  );
  TestValidator.equals(
    "response contains correct member email",
    successResponse.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "response contains correct member username",
    successResponse.member.username,
    memberUsername,
  );
}
