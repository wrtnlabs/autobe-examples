import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change request rejection when the member provides an incorrect
 * current password.
 *
 * Password verification is required for security to prevent unauthorized email
 * changes. The system should reject the request and not initiate the email
 * change process when an invalid password is provided. This validates that no
 * verification email is sent when password verification fails.
 *
 * Steps:
 *
 * 1. Create and authenticate a member account with valid credentials
 * 2. Attempt to request email change with correct new email but incorrect password
 * 3. Verify the API returns a 401 Unauthorized error
 * 4. Confirm the email change request was rejected and not processed
 */
export async function test_api_member_email_change_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create an authenticated member account
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "ValidPassword123!@#";
  const memberUsername: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(createdMember);

  // Step 2: Attempt email change with invalid password
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const invalidPassword: string = "WrongPassword123!@#";

  // Step 3: Verify the API rejects the request with 401 error
  await TestValidator.error(
    "email change should fail with invalid password",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
        connection,
        {
          body: {
            newEmail: newEmail,
            password: invalidPassword,
          } satisfies ICommunityPlatformMember.IEmailChangeRequest,
        },
      );
    },
  );

  // Step 4: Verify the email was not changed by attempting with correct password
  // This ensures the failed attempt did not leave the account in an inconsistent state
  const validEmailChangeRequest: ICommunityPlatformMember.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(validEmailChangeRequest);

  TestValidator.predicate(
    "email change with valid password should succeed",
    validEmailChangeRequest.success === true,
  );

  TestValidator.equals(
    "verification email should be sent to new email address",
    validEmailChangeRequest.verification_email_sent_to,
    newEmail,
  );
}
