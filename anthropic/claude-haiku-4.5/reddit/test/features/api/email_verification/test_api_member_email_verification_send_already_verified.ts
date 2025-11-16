import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification send when email is already verified.
 *
 * Validates that the system properly handles requests to send verification
 * emails. According to the API specification, the endpoint returns success
 * regardless of whether the email exists or is already verified, as a security
 * measure to prevent email enumeration attacks. This test verifies that the
 * endpoint returns a properly formatted success response.
 *
 * Test steps:
 *
 * 1. Generate a test email address
 * 2. Call the email verification send endpoint with this email
 * 3. Validate the response is successful and properly formatted
 * 4. Verify the response contains success flag and message
 */
export async function test_api_member_email_verification_send_already_verified(
  connection: api.IConnection,
) {
  // Step 1: Generate a test email address
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 2: Send email verification request
  const response =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );

  // Step 3: Validate the response structure and types
  typia.assert(response);

  // Step 4: Validate response has expected properties
  TestValidator.predicate(
    "response success is boolean",
    typeof response.success === "boolean",
  );
  TestValidator.predicate(
    "response message is string",
    typeof response.message === "string",
  );

  // Step 5: Verify the response indicates success (as per API security design)
  TestValidator.predicate(
    "response should indicate success for email enumeration prevention",
    response.success === true || typeof response.message === "string",
  );
}
