import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset request with valid registered email address.
 *
 * This test validates the complete password reset request workflow for a
 * legitimate user account. It creates a verified member account, then requests
 * a password reset using the registered email address, and validates the system
 * responds with a generic success message while maintaining security through
 * email enumeration protection.
 *
 * The test ensures:
 *
 * 1. Member account is successfully created with verified email
 * 2. Password reset request is accepted for the valid email
 * 3. System returns generic success message (no email enumeration)
 * 4. Response structure matches expected format
 */
export async function test_api_password_reset_request_valid_email_success(
  connection: api.IConnection,
) {
  // Step 1: Create a verified member account with a valid email address
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";

  const createMemberBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: memberEmail,
    password: memberPassword,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.name(2),
    website_url: typia.random<string & tags.Format<"uri">>(),
    profile_picture_url: typia.random<string & tags.Format<"uri">>(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember: IDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.members.create(connection, {
      body: createMemberBody,
    });

  typia.assert(createdMember);

  // Validate that member was created successfully
  TestValidator.equals(
    "created member username matches input",
    createdMember.username,
    createMemberBody.username,
  );

  // Step 2: Submit password reset request using the registered email address
  const resetRequestBody = {
    email: memberEmail,
  } satisfies IDiscussionBoardPasswordReset.IRequest;

  const resetResponse: IDiscussionBoardPasswordReset.IRequestResponse =
    await api.functional.discussionBoard.auth.password_reset.request(
      connection,
      {
        body: resetRequestBody,
      },
    );

  typia.assert(resetResponse);

  // Step 3: Validate the response structure and message
  TestValidator.predicate(
    "reset response message is non-empty string",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Validate that the message is generic and does not reveal email existence
  // The message should be intentionally vague for security purposes
  TestValidator.predicate(
    "reset response message is generic and secure",
    resetResponse.message.toLowerCase().includes("if") ||
      resetResponse.message.toLowerCase().includes("account"),
  );
}
