import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification token invalidation on new verification email request.
 *
 * Validates that requesting a new verification email operates correctly in the
 * email verification workflow. While the API only provides email sending
 * without direct token access, this test confirms that the verification email
 * send operation succeeds and can be called multiple times for the same email
 * address.
 *
 * Steps:
 *
 * 1. Send verification email for a member's email address
 * 2. Send another verification email for the same address
 * 3. Validate that both operations succeed
 * 4. Confirm the API returns appropriate success responses
 */
export async function test_api_member_email_verification_send_previous_token_invalidation(
  connection: api.IConnection,
) {
  // Generate a test email address for verification
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 1: Send first verification email
  const firstEmailResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(firstEmailResponse);
  TestValidator.predicate(
    "first verification email send succeeds",
    firstEmailResponse.success,
  );

  // Step 2: Send second verification email to same address (invalidates first token)
  const secondEmailResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: testEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(secondEmailResponse);
  TestValidator.predicate(
    "second verification email send succeeds",
    secondEmailResponse.success,
  );

  // Step 3: Verify both responses are successful
  TestValidator.predicate(
    "both email send operations complete successfully",
    firstEmailResponse.success && secondEmailResponse.success,
  );

  // Step 4: Confirm response messages are provided
  TestValidator.predicate(
    "response messages provide feedback for each send operation",
    typeof firstEmailResponse.message === "string" &&
      typeof secondEmailResponse.message === "string",
  );
}
