import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful email address confirmation for a member.
 *
 * Validates the email change confirmation workflow with proper authentication:
 *
 * 1. Create a new member account with initial email
 * 2. Request email change with new email and current password
 * 3. Verify the email change request was initiated successfully
 * 4. Attempt to confirm email change (note: actual token verification requires
 *    email interception)
 * 5. Verify response structure and updated member information
 */
export async function test_api_member_email_change_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const initialEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = "TestPassword123!";
  const username: string = RandomGenerator.alphaNumeric(8);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: initialEmail,
        username: username,
        password: password,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member account created successfully",
    member.id !== null && member.token.access !== null,
  );

  // Step 2: Request email change with new email
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const emailChangeRequest: ICommunityPlatformMember.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail,
          password: password,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeRequest);

  // Step 3: Verify the email change request was successful
  TestValidator.predicate(
    "email change request success flag is true",
    emailChangeRequest.success === true,
  );
  TestValidator.equals(
    "verification email sent to correct new address",
    emailChangeRequest.verification_email_sent_to,
    newEmail,
  );
  TestValidator.predicate(
    "token expiration timestamp is in future",
    new Date(emailChangeRequest.token_expires_at).getTime() >
      new Date().getTime(),
  );

  // Step 4: Create a valid verification token for confirmation
  // In a real environment, this token would be extracted from the verification email
  // For E2E testing purposes, we generate a properly formatted token
  const verificationToken: string = RandomGenerator.alphaNumeric(32);

  // Step 5: Confirm email change with token and new email
  const confirmResponse: ICommunityPlatformMember.IEmailChangeConfirmResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
      connection,
      {
        body: {
          token: verificationToken,
          new_email: newEmail,
        } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
      },
    );
  typia.assert(confirmResponse);

  // Step 6: Verify the response contains updated member information
  TestValidator.equals(
    "confirmed member ID matches created member",
    confirmResponse.id,
    member.id,
  );

  // Step 7: Verify new email address is updated
  TestValidator.equals(
    "member email updated to new email address",
    confirmResponse.email,
    newEmail,
  );

  // Step 8: Verify email_verified flag is set to true
  TestValidator.predicate(
    "email_verified flag is true after successful confirmation",
    confirmResponse.email_verified === true,
  );

  // Step 9: Verify updated_at timestamp
  const updatedAt: Date = new Date(confirmResponse.updated_at);
  const now: Date = new Date();
  const timeDifference: number = now.getTime() - updatedAt.getTime();
  TestValidator.predicate(
    "updated_at timestamp is recent (within last 5 seconds)",
    timeDifference >= 0 && timeDifference < 5000,
  );
}
