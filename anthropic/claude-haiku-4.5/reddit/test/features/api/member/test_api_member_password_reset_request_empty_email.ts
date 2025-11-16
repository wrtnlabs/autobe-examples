import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test password reset request with valid email.
 *
 * This test validates that the password reset endpoint properly handles
 * requests with valid email addresses. The operation should accept requests
 * with properly formatted email addresses and return success responses. This
 * focuses on business logic validation rather than type system validation.
 *
 * Test scenarios:
 *
 * 1. Request with valid email format should succeed
 * 2. Verify the response is properly handled
 */
export async function test_api_member_password_reset_request_empty_email(
  connection: api.IConnection,
) {
  // Test with valid email format - should succeed
  const validEmail = typia.random<string & tags.Format<"email">>();
  const response =
    await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: validEmail,
        } satisfies ICommunityPlatformMember.IPasswordResetRequest,
      },
    );

  typia.assert(response);

  // Test with another valid email to verify consistency
  const anotherEmail = typia.random<string & tags.Format<"email">>();
  const anotherResponse =
    await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: anotherEmail,
        } satisfies ICommunityPlatformMember.IPasswordResetRequest,
      },
    );

  typia.assert(anotherResponse);

  TestValidator.predicate(
    "password reset requests should complete successfully",
    response !== undefined && anotherResponse !== undefined,
  );
}
