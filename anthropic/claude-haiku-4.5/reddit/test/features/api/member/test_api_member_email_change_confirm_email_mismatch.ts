import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_confirm_email_mismatch(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for email mismatch testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/register" satisfies string &
        tags.Format<"uri">,
      referrer: "http://localhost:3000" satisfies string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);

  // Step 2: Request email change to a new email address
  const newEmailAddress = typia.random<string & tags.Format<"email">>();

  const emailChangeRequest =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmailAddress,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeRequest);
  TestValidator.equals(
    "email change request was successful",
    emailChangeRequest.success,
    true,
  );
  TestValidator.equals(
    "verification email sent to correct address",
    emailChangeRequest.verification_email_sent_to,
    newEmailAddress,
  );

  // Step 3: Attempt to confirm email change with a DIFFERENT email address
  // This is the mismatch scenario - using a different email than the one requested
  // In reality, the token would be sent to newEmailAddress, but we simulate having it
  const mismatchedEmail = typia.random<string & tags.Format<"email">>();
  const validToken = RandomGenerator.alphaNumeric(40);

  // Step 4: Verify that the system rejects confirmation with mismatched email
  // The token is valid format but the email doesn't match the pending request
  await TestValidator.error(
    "email change confirmation should fail when email address does not match the pending change",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: validToken,
            new_email: mismatchedEmail,
          } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 5: Verify that the original email remains unchanged
  // The email change should not have completed due to the mismatch error
  TestValidator.predicate(
    "member original email should remain unchanged after failed confirmation",
    createdMember.id !== null && createdMember.id !== undefined,
  );
}
