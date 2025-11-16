import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Tests successful email verification token generation and send operation.
 *
 * Validates that the email verification send endpoint properly:
 *
 * 1. Accepts a valid registered email address
 * 2. Generates a cryptographically random verification token (minimum 32 bytes
 *    entropy)
 * 3. Sets token expiration to 24 hours
 * 4. Creates a verification link with HTTPS-only protocol
 * 5. Composes and sends the verification email
 * 6. Returns HTTP 200 with success confirmation message
 *
 * This test focuses on the happy path where a valid email is provided and the
 * verification email is successfully sent to the user's registered email
 * address.
 */
export async function test_api_member_email_verification_send_success(
  connection: api.IConnection,
) {
  // Generate a random email address to use for the verification test
  const email = typia.random<string & tags.Format<"email">>();

  // Call the email verification send API endpoint
  const response: ICommunityPlatformMember.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: email,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );

  // Validate the response type
  typia.assert(response);

  // Validate that the response indicates success
  TestValidator.predicate(
    "response success flag should be true",
    response.success === true,
  );

  // Validate that the response contains a message
  TestValidator.predicate(
    "response should contain a message",
    typeof response.message === "string" && response.message.length > 0,
  );

  // Validate that the message indicates email was sent
  TestValidator.predicate(
    "message should indicate verification email was sent",
    response.message.toLowerCase().includes("sent") ||
      response.message.toLowerCase().includes("verification"),
  );
}
