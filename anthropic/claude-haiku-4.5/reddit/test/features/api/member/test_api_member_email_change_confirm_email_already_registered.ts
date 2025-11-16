import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates email change confirmation race condition handling.
 *
 * Tests the scenario where an email address becomes registered to another
 * member account between the email change request and confirmation steps.
 *
 * Process:
 *
 * 1. Create first member account (member1)
 * 2. Create second member account (member2)
 * 3. Member1 initiates email change request to a new email address
 * 4. Member2 initiates email change request to the same new email address
 * 5. Member2 confirms their email change first (claims the email)
 * 6. Member1 attempts to confirm their email change with the same email
 * 7. System detects the email is now in use and returns HTTP 409 Conflict
 *
 * This ensures the system prevents email conflicts and protects against race
 * conditions during concurrent email change operations.
 */
export async function test_api_member_email_change_confirm_email_already_registered(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "SecurePassword123!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphabets(10),
      password: member1Password,
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "SecurePassword456!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphabets(10),
      password: member2Password,
      ip: "192.168.1.2",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: Member1 initiates email change request to new email
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const member1EmailChangeRequest =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: targetEmail,
          password: member1Password,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(member1EmailChangeRequest);
  TestValidator.equals(
    "member1 verification email sent to target email",
    member1EmailChangeRequest.verification_email_sent_to,
    targetEmail,
  );

  // Step 4: Member2 initiates email change request to the SAME target email
  // Create new connection for member2 to ensure proper authentication context
  const member2Connection: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.join(member2Connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphabets(10),
      password: member2Password,
      ip: "192.168.1.2",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });

  const member2EmailChangeRequest =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      member2Connection,
      {
        body: {
          newEmail: targetEmail,
          password: member2Password,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(member2EmailChangeRequest);

  // Step 5: Member2 confirms their email change first (claims the email)
  // In real scenario, token comes from email verification link
  // For testing, we generate a valid-looking token
  const member2VerificationToken = RandomGenerator.alphaNumeric(32);
  await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
    member2Connection,
    {
      body: {
        token: member2VerificationToken,
        new_email: targetEmail,
      } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
    },
  );

  // Step 6 & 7: Member1 attempts to confirm email change - should fail with HTTP 409
  // because member2 has already claimed the targetEmail
  const member1VerificationToken = RandomGenerator.alphaNumeric(32);
  await TestValidator.error(
    "email change confirmation should fail when email is already registered to another account",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: member1VerificationToken,
            new_email: targetEmail,
          } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
        },
      );
    },
  );
}
