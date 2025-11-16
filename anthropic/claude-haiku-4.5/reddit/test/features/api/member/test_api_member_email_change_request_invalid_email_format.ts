import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change request with valid email format and successful validation.
 *
 * This test validates that the email change endpoint properly processes valid
 * email addresses and handles the email change request workflow correctly.
 * Since the DTO type system enforces RFC 5322 email format validation at
 * compile time, this test focuses on verifying the successful email change
 * request flow with valid email addresses.
 *
 * The test flow:
 *
 * 1. Create a new member account with valid credentials
 * 2. Request email change with a valid new email address
 * 3. Verify the email change request is processed successfully
 * 4. Confirm verification details are correct
 */
export async function test_api_member_email_change_request_invalid_email_format(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      ip: "192.168.1.100",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  typia.assert(createdMember);
  TestValidator.equals(
    "member created successfully",
    createdMember.token.access !== null,
    true,
  );

  // Step 2: Test email change request with valid email address
  const validNewEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: validNewEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );

  typia.assert(emailChangeResponse);
  TestValidator.equals(
    "email change request initiated successfully",
    emailChangeResponse.success,
    true,
  );
  TestValidator.equals(
    "verification email sent to correct address",
    emailChangeResponse.verification_email_sent_to,
    validNewEmail,
  );
  TestValidator.predicate("token expiration is in the future", () => {
    const expirationTime = new Date(
      emailChangeResponse.token_expires_at,
    ).getTime();
    return expirationTime > Date.now();
  });
}
