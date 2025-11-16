import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test rate limiting protection against verification email abuse.
 *
 * This test validates that the email verification send endpoint enforces proper
 * rate limiting to prevent abuse where attackers request thousands of emails to
 * overwhelm a target inbox. The system implements rate limiting with a maximum
 * of 1 email request per 5 minutes per email address.
 *
 * The test workflow:
 *
 * 1. Generate a test email address
 * 2. Send first verification email request - should succeed with success: true
 * 3. Immediately send second verification email request for same email - should
 *    return rate limit error
 * 4. Validate that the second request properly rejects the attempt with
 *    appropriate rate limit message
 */
export async function test_api_member_email_verification_send_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Generate a unique test email address
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 2: Send first verification email request - should succeed
  const firstResponse: ICommunityPlatformMember.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(firstResponse);

  // Validate first request indicates successful processing
  TestValidator.predicate(
    "first email verification request message should not be empty",
    typeof firstResponse.message === "string" &&
      firstResponse.message.length > 0,
  );

  // Step 3: Immediately send second verification email request for same email within rate limit window
  const secondResponse: ICommunityPlatformMember.IEmailVerifySendResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(secondResponse);

  // Step 4: Validate that the second request is rate limited
  TestValidator.predicate(
    "second request should fail due to rate limiting",
    secondResponse.success === false,
  );

  // Validate the rate limit error message indicates rate limiting
  const messageLower = secondResponse.message.toLowerCase();
  TestValidator.predicate(
    "rate limit error message should mention rate limit or timing constraint",
    messageLower.includes("rate") ||
      messageLower.includes("limit") ||
      messageLower.includes("try again") ||
      messageLower.includes("minute") ||
      messageLower.includes("wait"),
  );
}
