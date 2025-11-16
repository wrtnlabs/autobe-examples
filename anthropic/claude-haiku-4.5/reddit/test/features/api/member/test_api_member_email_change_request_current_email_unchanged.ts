import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_email_change_request_current_email_unchanged(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with a known email address
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const createMemberResult = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(16),
      password: "SecurePassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createMemberResult);
  TestValidator.predicate(
    "member account created successfully",
    createMemberResult.id !== undefined && createMemberResult.id.length > 0,
  );

  // Step 2: Attempt to request email change with the same email address
  // This should fail because the new email matches the current email
  await TestValidator.error(
    "email change request should fail when new email equals current email",
    async () => {
      const emailChangeRequest =
        await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
          connection,
          {
            body: {
              newEmail: memberEmail, // Same email as current
              password: "SecurePassword123!",
            } satisfies ICommunityPlatformMember.IEmailChangeRequest,
          },
        );
      typia.assert(emailChangeRequest);
    },
  );

  // Step 3: Verify that a valid email change request works with a different email
  const newEmail = typia.random<string & tags.Format<"email">>();
  const validEmailChangeRequest =
    await api.functional.communityPlatform.member.auth.member.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          newEmail: newEmail, // Different email
          password: "SecurePassword123!",
        } satisfies ICommunityPlatformMember.IEmailChangeRequest,
      },
    );
  typia.assert(validEmailChangeRequest);
  TestValidator.equals(
    "email change request response indicates success",
    validEmailChangeRequest.success,
    true,
  );
  TestValidator.equals(
    "verification email sent to new email address",
    validEmailChangeRequest.verification_email_sent_to,
    newEmail,
  );
  TestValidator.predicate(
    "token expiration is set in future",
    new Date(validEmailChangeRequest.token_expires_at) > new Date(),
  );
}
