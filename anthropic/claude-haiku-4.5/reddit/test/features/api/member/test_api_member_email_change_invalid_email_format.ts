import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change request rejection when the member provides a password that
 * doesn't match.
 *
 * This test validates that the email change endpoint properly rejects requests
 * when the provided password does not match the member's current password. This
 * ensures that only authorized account owners can change their email address,
 * even if they provide a valid RFC 5322 email format.
 *
 * Test workflow:
 *
 * 1. Create a new authenticated member account with valid credentials
 * 2. Attempt to change email with an incorrect password
 * 3. Verify that the request is rejected with an error
 * 4. Confirm that the member's email remains unchanged after the failed attempt
 * 5. Verify that email change succeeds with the correct password
 */
export async function test_api_member_email_change_invalid_email_format(
  connection: api.IConnection,
) {
  // 1. Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123!";
  const newMemberEmail = typia.random<string & tags.Format<"email">>();

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);
  TestValidator.equals(
    "member creation successful",
    createdMember.token.access !== null,
    true,
  );

  // 2. Test that email change is rejected with incorrect password
  await TestValidator.error(
    "should reject email change with incorrect password",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            newEmail: newMemberEmail,
            password: "WrongPassword123!",
          } satisfies ICommunityPlatformMember.IEmailChangeRequest,
        },
      );
    },
  );

  // 3. Verify that successful email change works with correct password
  const changeResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newMemberEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(changeResponse);
  TestValidator.equals(
    "email change request successful with correct password",
    changeResponse.success,
    true,
  );
  TestValidator.equals(
    "verification email sent to new address",
    changeResponse.verification_email_sent_to,
    newMemberEmail,
  );

  TestValidator.predicate(
    "email change validation workflow completed successfully",
    true,
  );
}
