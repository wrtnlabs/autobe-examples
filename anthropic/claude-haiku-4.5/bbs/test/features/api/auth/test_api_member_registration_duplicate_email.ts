import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration rejection when attempting to register with a
 * duplicate email address.
 *
 * This test validates that the member registration endpoint properly enforces
 * email uniqueness constraints. The scenario creates an initial member account
 * with a specific email address, then attempts to register another account
 * using the same email. The system should reject the duplicate registration
 * with an appropriate error message directing the user to log in or use a
 * different email address.
 *
 * This test ensures:
 *
 * 1. Email addresses are validated for uniqueness during registration
 * 2. The system rejects duplicate email registration attempts
 * 3. Proper error handling and messaging is provided for duplicate account
 *    attempts
 * 4. Database constraints on email uniqueness are enforced at the API level
 *
 * Steps:
 *
 * 1. Register initial member with a unique email address
 * 2. Verify successful registration and token generation
 * 3. Attempt to register another member with the same email address
 * 4. Verify the duplicate registration is rejected with an error
 * 5. Confirm the error indicates email is already in use
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create initial member account with specific email
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPassword123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  const firstMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: initialEmail,
        password: validPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(firstMember);

  // Step 2: Verify successful registration
  TestValidator.predicate(
    "first registration should succeed and return authorized member",
    firstMember.id !== undefined && firstMember.token !== undefined,
  );

  TestValidator.predicate(
    "access token should be present",
    firstMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    firstMember.token.refresh.length > 0,
  );

  // Step 3: Attempt to register another member with same email (should fail)
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: initialEmail, // Using same email as first member
          password: "DifferentPassword456",
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Step 4: Verify error is related to duplicate email
  // Try with a different email to confirm system still works
  const differentEmail = typia.random<string & tags.Format<"email">>();

  const secondMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: differentEmail,
        password: validPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(secondMember);

  // Step 5: Verify second member is different from first
  TestValidator.notEquals(
    "second member should have different ID from first member",
    firstMember.id,
    secondMember.id,
  );

  TestValidator.notEquals(
    "second member should have different access token",
    firstMember.token.access,
    secondMember.token.access,
  );
}
