import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful email verification workflow (send phase)
 *
 * This test validates the email verification process:
 *
 * 1. Create a new member account (initially unverified)
 * 2. Send verification email with token to the member's registered email
 * 3. Validate that verification email was sent successfully
 *
 * Tests that new members can request verification emails, which are then sent
 * to their registered email address with a unique verification token. This is
 * the first phase of the email verification workflow.
 */
export async function test_api_member_email_verification_successful_confirmation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);
  TestValidator.predicate(
    "member should be created with unique ID",
    createdMember.id !== undefined && createdMember.id.length > 0,
  );

  // Step 2: Send verification email with token
  const sendVerificationResponse =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: memberEmail,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(sendVerificationResponse);
  TestValidator.predicate(
    "verification email should be sent successfully",
    sendVerificationResponse.success === true,
  );
  TestValidator.predicate(
    "success message should be provided",
    sendVerificationResponse.message.length > 0,
  );

  // Step 3: Verify that access tokens were issued to the new member
  TestValidator.predicate(
    "member should receive access token for authentication",
    createdMember.token.access !== undefined &&
      createdMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "member should receive refresh token for session extension",
    createdMember.token.refresh !== undefined &&
      createdMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token should have expiration time",
    createdMember.token.expired_at !== undefined &&
      createdMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token should have expiration time",
    createdMember.token.refreshable_until !== undefined &&
      createdMember.token.refreshable_until.length > 0,
  );
}
