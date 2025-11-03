import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validates member registration duplicate email rejection.
 *
 * This test verifies that the registration endpoint properly enforces email
 * uniqueness constraints. It performs the following steps:
 *
 * 1. Create a new member account with a unique email address
 * 2. Attempt to register again with the same email address
 * 3. Verify that the duplicate registration is rejected with appropriate error
 * 4. Confirm that a different email can be registered successfully
 * 5. Validate email uniqueness prevents duplicate account creation
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Generate unique email and password for first registration
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPass123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  // Step 2: Register the first member with unique email
  const firstRegistration = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: uniqueEmail,
        password: validPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(firstRegistration);

  // Validate first registration response contains expected fields
  TestValidator.equals(
    "first registration email matches request",
    firstRegistration.email,
    uniqueEmail,
  );
  TestValidator.predicate(
    "first registration response has all required fields",
    firstRegistration.id !== null &&
      firstRegistration.email !== null &&
      firstRegistration.created_at !== null,
  );

  // Step 3: Attempt to register again with the same email address
  // This should fail because email must be unique
  await TestValidator.error(
    "duplicate email registration should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: uniqueEmail,
          password: validPassword,
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Step 4: Verify that we can still register with a different email
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondRegistration = await api.functional.discussionBoard.auth.register(
    connection,
    {
      body: {
        email: secondEmail,
        password: validPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    },
  );
  typia.assert(secondRegistration);

  // Validate second registration has different email from first
  TestValidator.notEquals(
    "second registration has different email from first",
    secondRegistration.email,
    firstRegistration.email,
  );
  TestValidator.equals(
    "second registration email matches request",
    secondRegistration.email,
    secondEmail,
  );

  // Step 5: Validate email uniqueness constraint is working
  TestValidator.predicate(
    "both registrations have unique email addresses",
    firstRegistration.email !== secondRegistration.email,
  );
}
