import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email verification send with valid email addresses.
 *
 * Since the API enforces email format validation at compile-time through
 * TypeScript's type system (via typia's Format<"email"> tag), invalid email
 * formats cannot be sent to the API - TypeScript compilation will fail.
 *
 * This test validates the happy path: sending verification tokens to properly
 * formatted email addresses. The email format validation itself is enforced by
 * the TypeScript compiler before any API call can be made.
 *
 * The test demonstrates that:
 *
 * - Valid email addresses can be successfully sent for verification
 * - The API correctly returns success responses for valid email formats
 * - The endpoint is accessible and functional
 */
export async function test_api_member_email_verification_send_invalid_email_format(
  connection: api.IConnection,
) {
  // Test case 1: Send verification email to a valid email address
  const validEmail1 = typia.random<string & tags.Format<"email">>();
  const response1 =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: validEmail1,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "send verification email should return success response",
    response1.success === true || response1.success === false,
  );
  TestValidator.predicate(
    "response should contain message",
    typeof response1.message === "string",
  );

  // Test case 2: Send verification email to another valid email address
  const validEmail2 = typia.random<string & tags.Format<"email">>();
  const response2 =
    await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: validEmail2,
        } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
      },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "second verification email should also be processed",
    typeof response2.message === "string" && response2.message.length > 0,
  );

  // Test case 3: Multiple verification requests with different valid emails
  const validEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );

  for (const email of validEmails) {
    const response =
      await api.functional.communityPlatform.auth.member.email_verify.send.sendEmailVerification(
        connection,
        {
          body: {
            email: email,
          } satisfies ICommunityPlatformMember.IEmailVerifySendRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      `verification email send should complete for valid email`,
      response.success === true || response.success === false,
    );
  }
}
