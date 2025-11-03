import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Validates email verification resend rate limiting enforcement.
 *
 * This test ensures the system enforces rate limiting on email verification
 * resend requests to prevent abuse. After a member requests verification email
 * resend 5 times within a 60-minute window, subsequent requests are rejected
 * with a rate limit error indicating how long to wait before trying again.
 *
 * Test flow:
 *
 * 1. Register a new member account
 * 2. Attempt 5 successful verification email resend requests
 * 3. Verify the 6th request is rejected due to rate limiting
 * 4. Confirm the error message indicates rate limit exceeded
 */
export async function test_api_email_verification_resend_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123"; // Must meet: min 8 chars, uppercase, lowercase, number

  const registered = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(registered);

  // Step 2: Attempt 5 successful verification email resend requests
  for (let i = 0; i < 5; i++) {
    const response =
      await api.functional.discussionBoard.auth.resend_verification.resendVerification(
        connection,
        {
          body: {
            email: memberEmail,
          } satisfies IDiscussionBoardMemberSession.IResendVerificationRequest,
        },
      );
    typia.assert(response);

    TestValidator.predicate(
      `resend request ${i + 1} should succeed`,
      response.success === true,
    );

    TestValidator.equals(
      `resend request ${i + 1} email should match`,
      response.email,
      memberEmail,
    );
  }

  // Step 3: Verify the 6th request is rejected due to rate limiting
  await TestValidator.error(
    "6th resend request should be rejected due to rate limiting",
    async () => {
      await api.functional.discussionBoard.auth.resend_verification.resendVerification(
        connection,
        {
          body: {
            email: memberEmail,
          } satisfies IDiscussionBoardMemberSession.IResendVerificationRequest,
        },
      );
    },
  );
}
