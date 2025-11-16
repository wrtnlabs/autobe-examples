import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_verification_send_nonexistent_email(
  connection: api.IConnection,
) {
  // Attempt to send verification email to a non-existent moderator email address
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();

  // The API should return an error when attempting to send verification
  // email to an email address that is not registered in the system
  await TestValidator.error(
    "should fail when sending verification email to non-existent moderator email",
    async () => {
      await api.functional.communityPlatform.auth.moderator.email_verify.send.sendEmailVerification(
        connection,
        {
          body: {
            email: nonexistentEmail,
          } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );
}
