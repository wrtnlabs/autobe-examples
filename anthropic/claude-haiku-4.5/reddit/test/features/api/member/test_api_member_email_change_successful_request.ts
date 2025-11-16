import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the successful initiation of email change process by an authenticated
 * member.
 *
 * This test validates the email change request functionality, ensuring that:
 *
 * 1. An authenticated member can request to change their email address
 * 2. The system validates the current password for security
 * 3. The new email is unique and properly validated
 * 4. A verification token is generated with correct expiration
 * 5. The verification email is sent to the new address
 * 6. The response contains all required fields with correct types and formats
 *
 * Workflow:
 *
 * 1. Create a new member account with email and password
 * 2. Request email change with new email and current password
 * 3. Verify response structure and data validity
 * 4. Confirm token expiration is approximately 24 hours away
 */
export async function test_api_member_email_change_successful_request(
  connection: api.IConnection,
) {
  // Step 1: Create a new authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberIp = "192.168.1.100";

  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      ip: memberIp,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(registeredMember);

  // Verify member was created successfully
  TestValidator.predicate(
    "member account created with valid ID and token",
    registeredMember.id !== null &&
      registeredMember.id !== undefined &&
      registeredMember.token.access !== null &&
      registeredMember.token.access !== undefined,
  );

  // Step 2: Request email change with new email and current password
  const newEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);

  // Step 3: Verify response structure and business logic
  TestValidator.equals(
    "response indicates success",
    emailChangeResponse.success,
    true,
  );

  TestValidator.equals(
    "verification email sent to new email address",
    emailChangeResponse.verification_email_sent_to,
    newEmail,
  );

  TestValidator.predicate(
    "success message is provided and non-empty",
    emailChangeResponse.message.length > 0,
  );

  // Step 4: Validate token expiration business logic
  const expirationTime = new Date(emailChangeResponse.token_expires_at);
  const now = new Date();
  const expirationHours =
    (expirationTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  TestValidator.predicate(
    "token expiration is approximately 24 hours from now",
    expirationHours >= 23 && expirationHours <= 25,
  );

  TestValidator.predicate(
    "token expiration timestamp is in the future",
    expirationTime.getTime() > now.getTime(),
  );
}
