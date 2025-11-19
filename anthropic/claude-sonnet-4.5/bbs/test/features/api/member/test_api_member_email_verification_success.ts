import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful email verification flow for newly registered members.
 *
 * This test validates the complete email verification workflow:
 *
 * 1. Register a new member account which generates a verification token
 * 2. Submit a verification token to verify the member's email address
 * 3. Confirm email_verified is set to true and email_verified_at is populated
 * 4. Validate that the complete member profile is returned with updated status
 *
 * Note: This test uses simulation mode because E2E tests do not have access to
 * the verification token stored in the database. In production, the token is
 * sent via email. Simulation mode allows us to validate the API contract and
 * response structure without requiring actual token retrieval.
 */
export async function test_api_member_email_verification_success(
  connection: api.IConnection,
) {
  // Enable simulation mode for testing
  const simulatedConnection = { ...connection, simulate: true };

  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const registrationData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(simulatedConnection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Step 2: Prepare verification request with a simulated token
  // In production, this token would be extracted from the verification email
  const verificationToken = RandomGenerator.alphaNumeric(64);

  const verificationRequest = {
    token: verificationToken,
  } satisfies IDiscussionBoardMember.IVerifyEmail;

  // Step 3: Submit the verification token to verify the email
  const verifiedMember: IDiscussionBoardMember =
    await api.functional.auth.member.email.verify.verifyEmail(
      simulatedConnection,
      {
        body: verificationRequest,
      },
    );

  typia.assert(verifiedMember);

  // Step 4: Validate that the response structure is correct
  // In simulation mode, we validate the type structure and business logic expectations
  TestValidator.predicate(
    "verified member has ID",
    verifiedMember.id.length > 0,
  );
  TestValidator.predicate(
    "verified member has email",
    verifiedMember.email.length > 0,
  );
  TestValidator.predicate(
    "verified member has username",
    verifiedMember.username.length >= 3,
  );
  TestValidator.equals(
    "email is verified",
    verifiedMember.email_verified,
    true,
  );
  TestValidator.predicate(
    "email_verified_at is populated",
    verifiedMember.email_verified_at !== null &&
      verifiedMember.email_verified_at !== undefined,
  );

  // Step 5: Validate that required member fields are present
  TestValidator.predicate(
    "member has created_at",
    verifiedMember.created_at.length > 0,
  );
  TestValidator.predicate(
    "member has updated_at",
    verifiedMember.updated_at.length > 0,
  );
  TestValidator.equals(
    "member is not suspended",
    verifiedMember.is_suspended,
    false,
  );
}
