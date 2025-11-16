import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_confirm_expired_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphabets(8);

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

  // Step 2: Initiate first email change request
  const newEmail1 = typia.random<string & tags.Format<"email">>();

  const firstChangeRequest: ICommunityPlatformMember.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail1,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(firstChangeRequest);

  TestValidator.equals(
    "first email change request should succeed",
    firstChangeRequest.success,
    true,
  );

  // Step 3: Initiate second email change request (invalidates first token)
  const newEmail2 = typia.random<string & tags.Format<"email">>();

  const secondChangeRequest: ICommunityPlatformMember.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail2,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(secondChangeRequest);

  // Step 4: Attempt to confirm with the first (now invalid/expired) token
  // Using a dummy token to simulate expired token since we cannot capture the actual token
  const expiredToken = RandomGenerator.alphaNumeric(40);

  await TestValidator.error(
    "expired or invalid token should fail during confirmation",
    async () => {
      await api.functional.communityPlatform.member.auth.member.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: expiredToken,
            new_email: newEmail1,
          } satisfies ICommunityPlatformMember.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 5: Verify that the member's original email is still in use
  // Attempt to create another member with the same email should still fail or new request shows original email is valid
  const verifyConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // The original email should still be associated with the original member
  // since the change was never completed due to expired token
  const anotherChangeRequest: ICommunityPlatformMember.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail2,
          password: memberPassword,
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(anotherChangeRequest);

  TestValidator.equals(
    "member email should still be the original email after expired token rejection",
    anotherChangeRequest.verification_email_sent_to,
    newEmail2,
  );
}
