import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_registration_successful(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration credentials
  // Email must be unique and in valid format
  // Password must meet security requirements: minimum 8 chars, uppercase, lowercase, and number
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  // Step 2: Attempt registration with valid credentials
  // The registration should succeed and return member information
  const registrationResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  // Step 3: Validate response structure and data
  // Response should contain member ID (UUID), email, and creation timestamp
  typia.assert(registrationResponse);

  // Step 4: Verify returned member data matches registration input
  TestValidator.equals(
    "registered member email matches input",
    registrationResponse.email,
    email,
  );

  // Step 5: Verify member ID is a valid UUID format
  TestValidator.predicate(
    "member ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registrationResponse.id,
    ),
  );

  // Step 6: Verify creation timestamp is present and valid ISO 8601 format
  TestValidator.predicate(
    "creation timestamp is valid ISO 8601 date",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      registrationResponse.created_at,
    ),
  );

  // Step 7: Test duplicate email rejection
  // Attempting to register with the same email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.discussionBoard.auth.register(connection, {
        body: {
          email: email,
          password: "AnotherPass456",
        } satisfies IDiscussionBoardMember.IRegisterRequest,
      });
    },
  );

  // Step 8: Test with different valid credentials to confirm successful re-registration capability
  // Generate another unique email and password
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondPassword = "ValidPass789";

  const secondRegistrationResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: secondEmail,
        password: secondPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });

  typia.assert(secondRegistrationResponse);

  // Step 9: Verify second registration returns different member ID
  TestValidator.notEquals(
    "second member ID should be different from first",
    secondRegistrationResponse.id,
    registrationResponse.id,
  );

  // Step 10: Verify both registrations are properly timestamped
  TestValidator.predicate(
    "second member created_at is a valid timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      secondRegistrationResponse.created_at,
    ),
  );
}
