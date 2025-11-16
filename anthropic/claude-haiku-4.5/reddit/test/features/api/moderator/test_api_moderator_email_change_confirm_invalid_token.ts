import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_email_change_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Initiate email change request with correct password
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailChangeResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          password: moderatorPassword,
          new_email: newEmail,
        } satisfies ICommunityPlatformModerator.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);
  TestValidator.equals(
    "email change request successful",
    emailChangeResponse.new_email,
    newEmail,
  );

  // Step 3: Attempt confirmation with invalid token format - too short
  await TestValidator.error(
    "should reject confirmation with short invalid token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: "invalid",
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 4: Attempt confirmation with empty token
  await TestValidator.error(
    "should reject confirmation with empty token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: "",
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 5: Attempt confirmation with random malformed token
  await TestValidator.error(
    "should reject confirmation with random malformed token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: RandomGenerator.alphaNumeric(64),
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 6: Attempt confirmation with another random token
  await TestValidator.error(
    "should reject confirmation with another invalid token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: RandomGenerator.alphaNumeric(128),
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 7: Attempt confirmation with malicious-looking token (special characters)
  await TestValidator.error(
    "should reject confirmation with special character token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: "../../../etc/passwd",
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 8: Attempt confirmation with token containing null bytes
  await TestValidator.error(
    "should reject confirmation with null byte injection token",
    async () => {
      await api.functional.communityPlatform.moderator.auth.moderator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: "token\x00injected",
          } satisfies ICommunityPlatformModerator.IEmailChangeConfirm,
        },
      );
    },
  );
}
