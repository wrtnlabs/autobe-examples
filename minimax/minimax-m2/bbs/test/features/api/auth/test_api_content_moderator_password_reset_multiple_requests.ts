import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

export async function test_api_content_moderator_password_reset_multiple_requests(
  connection: api.IConnection,
) {
  // Create content moderator account
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorDisplayName: string = RandomGenerator.name();

  const moderator: IEconPoliticalDiscussionContentModerator.IAuthorized =
    await api.functional.auth.contentModerator.join.register(connection, {
      body: {
        email: moderatorEmail,
        password: "TestPass123!",
        display_name: moderatorDisplayName,
        bio: "Content moderator for testing password reset functionality",
        href: "https://example.com/register",
        referrer: "https://example.com/login",
      } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
    });
  typia.assert(moderator);

  // Test multiple password reset requests
  const resetRequest1: IEconPoliticalDiscussionContentModerator.IResetPassword =
    {
      email: moderatorEmail,
    };

  const resetRequest2: IEconPoliticalDiscussionContentModerator.IResetPassword =
    {
      email: moderatorEmail,
    };

  const resetRequest3: IEconPoliticalDiscussionContentModerator.IResetPassword =
    {
      email: moderatorEmail,
    };

  // First password reset request
  const response1: IEconPoliticalDiscussionContentModerator.IPasswordResetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      { body: resetRequest1 },
    );
  typia.assert(response1);

  TestValidator.equals(
    "first reset response has message",
    response1.message,
    "Password reset instructions have been sent to your email address",
  );
  TestValidator.predicate(
    "first reset email sent status",
    response1.email_sent === true,
  );
  TestValidator.notEquals(
    "first reset has next steps",
    response1.next_steps,
    null,
  );

  // Second password reset request (immediate follow-up)
  const response2: IEconPoliticalDiscussionContentModerator.IPasswordResetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      { body: resetRequest2 },
    );
  typia.assert(response2);

  TestValidator.equals(
    "second reset response has message",
    response2.message,
    "Password reset instructions have been sent to your email address",
  );
  TestValidator.predicate(
    "second reset email sent status",
    response2.email_sent === true,
  );
  TestValidator.equals(
    "second reset next steps matches first",
    response2.next_steps,
    response1.next_steps,
  );

  // Third password reset request (testing continued functionality)
  const response3: IEconPoliticalDiscussionContentModerator.IPasswordResetResponse =
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      { body: resetRequest3 },
    );
  typia.assert(response3);

  TestValidator.equals(
    "third reset response has message",
    response3.message,
    "Password reset instructions have been sent to your email address",
  );
  TestValidator.predicate(
    "third reset email sent status",
    response3.email_sent === true,
  );
  TestValidator.equals(
    "third reset next steps consistent",
    response3.next_steps,
    response1.next_steps,
  );

  // Validate that all responses have consistent structure
  TestValidator.equals(
    "all responses have same message structure",
    response1.message,
    response2.message,
  );
  TestValidator.equals(
    "responses maintain consistency",
    response2.message,
    response3.message,
  );

  // Test invalid email handling in multiple requests
  const invalidResetRequest: IEconPoliticalDiscussionContentModerator.IResetPassword =
    {
      email: "invalid@example.com",
    };

  await TestValidator.error("invalid email should fail", async () => {
    await api.functional.auth.contentModerator.password.reset.resetPassword(
      connection,
      { body: invalidResetRequest },
    );
  });
}
