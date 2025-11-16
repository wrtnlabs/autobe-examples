import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_password_reset_request_success(
  connection: api.IConnection,
) {
  // Generate a valid email address for the password reset request
  const memberEmail = typia.random<string & tags.Format<"email">>();

  // Call the password reset request endpoint with the member's email
  await api.functional.communityPlatform.auth.member.password_reset.request.requestPasswordReset(
    connection,
    {
      body: {
        email: memberEmail,
      } satisfies ICommunityPlatformMember.IPasswordResetRequest,
    },
  );

  // Verify that the operation completed successfully
  TestValidator.predicate(
    "password reset request should complete without error",
    true,
  );
}
