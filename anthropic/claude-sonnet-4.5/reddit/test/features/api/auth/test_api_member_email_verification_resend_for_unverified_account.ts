import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test email verification resend for unverified member account.
 *
 * Validates the complete workflow of requesting a new verification email for a
 * member who has registered but not yet verified their email address. This
 * ensures members who didn't receive or lost their original verification email
 * can request a new one.
 *
 * Workflow:
 *
 * 1. Create a new member account (starts with email_verified = false)
 * 2. Request a new verification email through the resend endpoint
 * 3. Validate successful response with confirmation message
 * 4. Verify response structure matches expected type
 */
export async function test_api_member_email_verification_resend_for_unverified_account(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
  } satisfies IRedditLikeMember.ICreate;

  const newMember = await api.functional.auth.member.join(connection, {
    body: registrationData,
  });
  typia.assert(newMember);

  TestValidator.equals(
    "new member email should be unverified",
    newMember.email_verified,
    false,
  );

  const resendRequest = {
    email: memberEmail,
  } satisfies IRedditLikeMember.IResendVerification;

  const resendResponse =
    await api.functional.auth.member.email.verification.resend.resendVerification(
      connection,
      {
        body: resendRequest,
      },
    );
  typia.assert(resendResponse);

  TestValidator.equals(
    "resend verification should succeed",
    resendResponse.success,
    true,
  );

  TestValidator.predicate(
    "response should contain confirmation message",
    typeof resendResponse.message === "string" &&
      resendResponse.message.length > 0,
  );
}
