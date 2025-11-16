import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_verification_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Create a moderator account first
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Verify that the moderator's email is not verified initially
  TestValidator.predicate(
    "moderator email should not be verified after registration",
    !moderator.email_verified,
  );

  // Attempt to confirm email verification with an invalid token
  await TestValidator.error(
    "invalid token should be rejected for email verification",
    async () => {
      const invalidToken = RandomGenerator.alphaNumeric(64);
      await api.functional.communityPlatform.auth.moderator.email_verify.confirm(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformModerator.IEmailVerifyRequest,
        },
      );
    },
  );
}
