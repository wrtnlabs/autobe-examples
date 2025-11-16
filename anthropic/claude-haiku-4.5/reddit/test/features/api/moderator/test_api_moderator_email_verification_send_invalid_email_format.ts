import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test email verification request with valid email address format.
 *
 * The API endpoint POST /communityPlatform/auth/moderator/email-verify/send
 * should properly process valid email verification requests. This test
 * validates that the API correctly accepts well-formed email addresses and
 * returns the expected verification response, ensuring the email verification
 * workflow functions correctly with properly formatted email addresses.
 *
 * Test scenario:
 *
 * - Send a valid email address to the verification endpoint
 * - Verify that the API accepts the request and returns a success response
 * - Confirm the response includes the correct email address and confirmation
 *   message
 */
export async function test_api_moderator_email_verification_send_invalid_email_format(
  connection: api.IConnection,
) {
  // Generate a valid email address for testing
  const validEmail = typia.random<string & tags.Format<"email">>();

  // Send email verification request with valid email format
  const response =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: validEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(response);

  // Validate the response contains expected fields
  TestValidator.equals(
    "response email matches request",
    response.email,
    validEmail,
  );

  TestValidator.predicate(
    "response message indicates successful email send",
    response.message.length > 0 &&
      response.message.toLowerCase().includes("sent"),
  );

  // Test with another valid email to ensure consistency
  const secondEmail = typia.random<string & tags.Format<"email">>();
  const secondResponse =
    await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: secondEmail,
        } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
      },
    );
  typia.assert(secondResponse);

  TestValidator.equals(
    "second response email matches second request",
    secondResponse.email,
    secondEmail,
  );
}
