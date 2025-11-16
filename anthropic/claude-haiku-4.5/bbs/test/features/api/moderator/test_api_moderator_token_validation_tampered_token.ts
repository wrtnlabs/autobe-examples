import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token validation with a token that has been tampered with or has an
 * invalid signature.
 *
 * This test validates that the token validation system properly detects and
 * rejects forged or corrupted tokens with invalid JWT signatures. The test:
 *
 * 1. Creates a valid moderator account and obtains a legitimate JWT access token
 * 2. Tampers with the token by modifying its signature (the part after the second
 *    dot in JWT format)
 * 3. Attempts to validate the tampered token through the validation endpoint
 * 4. Verifies that validation fails (is_valid returns false)
 * 5. Confirms that optional moderator fields are null/undefined when validation
 *    fails
 * 6. Ensures the role field remains 'moderator' even when validation fails
 *
 * This test ensures the security of the authentication system by confirming
 * that JWT signature verification properly identifies and rejects compromised
 * tokens.
 */
export async function test_api_moderator_token_validation_tampered_token(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account and obtain authentication token
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.alphaNumeric(10);
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName: string = RandomGenerator.name();

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(authorized);

  // Extract the valid access token
  const validToken: string = authorized.token.access;

  // Step 2: Tamper with the token by modifying the signature
  // JWT format is: header.payload.signature
  // We'll modify the last part (signature) to create an invalid token
  const tokenParts: string[] = validToken.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  // Modify the signature portion to create a tampered token
  // Replace all signature characters with invalid Base64 characters to guarantee invalidity
  const tamperedSignature: string = "TAMPEREDTAMPEREDTAMPEREDTAMPEREDTAMPERED";
  const tamperedToken: string = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSignature}`;

  // Step 3: Attempt to validate the tampered token
  const validationResult: IDiscussionBoardModerator.ITokenValidation =
    await api.functional.discussionBoard.moderator.auth.moderator.validate_token.validateToken(
      connection,
      {
        body: {
          token: tamperedToken,
        } satisfies IDiscussionBoardModerator.IValidateToken,
      },
    );
  typia.assert(validationResult);

  // Step 4: Verify that validation fails
  TestValidator.predicate(
    "tampered token should fail validation",
    validationResult.is_valid === false,
  );

  // Step 5: Confirm that optional fields are null/undefined when validation fails
  TestValidator.predicate(
    "moderator_id should be null or undefined when validation fails",
    validationResult.moderator_id === null ||
      validationResult.moderator_id === undefined,
  );

  TestValidator.predicate(
    "username should be null or undefined when validation fails",
    validationResult.username === null ||
      validationResult.username === undefined,
  );

  TestValidator.predicate(
    "display_name should be null or undefined when validation fails",
    validationResult.display_name === null ||
      validationResult.display_name === undefined,
  );

  TestValidator.predicate(
    "email should be null or undefined when validation fails",
    validationResult.email === null || validationResult.email === undefined,
  );

  TestValidator.predicate(
    "email_verified should be null or undefined when validation fails",
    validationResult.email_verified === null ||
      validationResult.email_verified === undefined,
  );

  TestValidator.predicate(
    "account_status should be null or undefined when validation fails",
    validationResult.account_status === null ||
      validationResult.account_status === undefined,
  );

  TestValidator.predicate(
    "session_id should be null or undefined when validation fails",
    validationResult.session_id === null ||
      validationResult.session_id === undefined,
  );

  TestValidator.predicate(
    "session_created_at should be null or undefined when validation fails",
    validationResult.session_created_at === null ||
      validationResult.session_created_at === undefined,
  );

  TestValidator.predicate(
    "token_issued_at should be null or undefined when validation fails",
    validationResult.token_issued_at === null ||
      validationResult.token_issued_at === undefined,
  );

  TestValidator.predicate(
    "token_expires_at should be null or undefined when validation fails",
    validationResult.token_expires_at === null ||
      validationResult.token_expires_at === undefined,
  );

  // Step 6: Ensure the role field remains 'moderator' even when validation fails
  TestValidator.equals(
    "role should always be 'moderator'",
    validationResult.role,
    "moderator",
  );
}
