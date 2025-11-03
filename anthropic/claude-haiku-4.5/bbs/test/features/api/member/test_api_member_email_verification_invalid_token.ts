import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test email verification rejection with invalid or malformed verification
 * token.
 *
 * This test validates the email verification system's token validation logic
 * by:
 *
 * 1. Creating a new member account through registration (generates legitimate
 *    token)
 * 2. Attempting verification with various invalid tokens (malformed, non-existent,
 *    random)
 * 3. Verifying the system rejects invalid tokens with appropriate error response
 * 4. Confirming the member account status remains inactive after failed
 *    verification
 * 5. Ensuring the account cannot be used until properly verified with valid token
 *
 * This ensures only properly formatted and legitimate tokens can activate
 * accounts, protecting against unauthorized account activation and token
 * tampering.
 */
export async function test_api_member_email_verification_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPassword123"; // Meets requirements: 8+ chars, uppercase, lowercase, number

  const registrationResponse: IDiscussionBoardMember.IRegisterResponse =
    await api.functional.discussionBoard.auth.register(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(registrationResponse);

  TestValidator.predicate(
    "registration should return valid member with UUID id",
    registrationResponse.id.length > 0,
  );

  TestValidator.equals(
    "registered member email should match input",
    registrationResponse.email,
    email,
  );

  // Step 2: Test verification with various invalid tokens

  // Test 2a: Empty string token
  const emptyTokenResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: "",
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );
  typia.assert(emptyTokenResponse);

  TestValidator.predicate(
    "verification with empty token should fail",
    emptyTokenResponse.success === false,
  );

  TestValidator.predicate(
    "failure response should contain error message",
    emptyTokenResponse.message.length > 0,
  );

  TestValidator.predicate(
    "account status should remain inactive after failed verification",
    emptyTokenResponse.account_status === "inactive",
  );

  // Test 2b: Random malformed token
  const malformedToken = RandomGenerator.alphaNumeric(32);
  const malformedTokenResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: malformedToken,
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );
  typia.assert(malformedTokenResponse);

  TestValidator.predicate(
    "verification with malformed random token should fail",
    malformedTokenResponse.success === false,
  );

  TestValidator.predicate(
    "account status should remain inactive after malformed token",
    malformedTokenResponse.account_status === "inactive",
  );

  // Test 2c: UUID format token (valid format but non-existent)
  const fakeUuidToken = typia.random<string & tags.Format<"uuid">>();
  const fakeUuidResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: fakeUuidToken,
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );
  typia.assert(fakeUuidResponse);

  TestValidator.predicate(
    "verification with non-existent UUID token should fail",
    fakeUuidResponse.success === false,
  );

  TestValidator.predicate(
    "account status should remain inactive after non-existent token",
    fakeUuidResponse.account_status === "inactive",
  );

  // Test 2d: Very long invalid token
  const longInvalidToken = RandomGenerator.content({ paragraphs: 1 });
  const longTokenResponse: IDiscussionBoardMemberSession.IVerifyEmailResponse =
    await api.functional.discussionBoard.auth.verify_email.verifyEmail(
      connection,
      {
        body: {
          token: longInvalidToken,
        } satisfies IDiscussionBoardMemberSession.IVerifyEmailRequest,
      },
    );
  typia.assert(longTokenResponse);

  TestValidator.predicate(
    "verification with overly long invalid token should fail",
    longTokenResponse.success === false,
  );

  TestValidator.predicate(
    "account status should remain inactive after long invalid token",
    longTokenResponse.account_status === "inactive",
  );

  // Step 3: Verify all invalid token attempts result in consistent error response
  TestValidator.predicate(
    "all invalid token attempts should return success=false",
    [
      emptyTokenResponse,
      malformedTokenResponse,
      fakeUuidResponse,
      longTokenResponse,
    ].every((response) => response.success === false),
  );

  TestValidator.predicate(
    "all invalid token attempts should keep account status inactive",
    [
      emptyTokenResponse,
      malformedTokenResponse,
      fakeUuidResponse,
      longTokenResponse,
    ].every((response) => response.account_status === "inactive"),
  );
}
