import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_content_moderator_password_reset_success(
  connection: api.IConnection,
) {
  // Step 1: Create a content moderator account for testing
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: moderatorEmail,
        password: "SecurePass123!",
        bio: "Test content moderator for password reset validation",
        avatar_url: "https://example.com/avatar.jpg",
        ip: "192.168.1.100",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });

  // Validate the created moderator account
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created successfully",
    moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator status is active",
    moderator.status,
    "active",
  );

  // Step 2: Request password reset using the moderator's email
  const passwordResetResponse: IEconPoliticalDiscussionContentModerator.IPasswordResetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IEconPoliticalDiscussionContentModerator.IResetPassword,
      },
    );

  // Step 3: Validate the password reset response structure and content
  typia.assert(passwordResetResponse);

  // Validate response contains confirmation message
  TestValidator.predicate(
    "confirmation message should be present",
    passwordResetResponse.message !== null &&
      passwordResetResponse.message !== undefined &&
      passwordResetResponse.message.length > 0,
  );

  // Validate next steps are provided
  TestValidator.predicate(
    "next steps should be provided",
    passwordResetResponse.next_steps !== null &&
      passwordResetResponse.next_steps !== undefined &&
      passwordResetResponse.next_steps.length > 0,
  );

  // Validate email delivery confirmation
  TestValidator.equals(
    "email should be marked as sent",
    passwordResetResponse.email_sent,
    true,
  );

  // Validate the response structure matches expected format
  TestValidator.predicate(
    "message contains expected content",
    passwordResetResponse.message.toLowerCase().includes("reset") ||
      passwordResetResponse.message.toLowerCase().includes("email") ||
      passwordResetResponse.message.toLowerCase().includes("password"),
  );

  TestValidator.predicate(
    "next steps contain email guidance",
    passwordResetResponse.next_steps.toLowerCase().includes("email") ||
      passwordResetResponse.next_steps.toLowerCase().includes("token") ||
      passwordResetResponse.next_steps.toLowerCase().includes("24 hour") ||
      passwordResetResponse.next_steps.toLowerCase().includes("instructions"),
  );

  // Step 4: Verify that password reset works with exact same email (idempotency)
  const secondResetResponse: IEconPoliticalDiscussionContentModerator.IPasswordResetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IEconPoliticalDiscussionContentModerator.IResetPassword,
      },
    );

  typia.assert(secondResetResponse);

  // Validate consistent response for repeated requests
  TestValidator.equals(
    "second reset request also confirms email sent",
    secondResetResponse.email_sent,
    true,
  );
  TestValidator.predicate(
    "second reset has confirmation message",
    secondResetResponse.message !== null &&
      secondResetResponse.message !== undefined,
  );

  // Step 5: Validate response data integrity
  TestValidator.equals(
    "both responses have email sent status",
    passwordResetResponse.email_sent,
    secondResetResponse.email_sent,
  );

  TestValidator.predicate(
    "responses contain similar messaging",
    passwordResetResponse.message.length > 0 &&
      secondResetResponse.message.length > 0,
  );
}
