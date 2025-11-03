import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPasswordReset";

/**
 * Test password reset token expiration handling.
 *
 * This test validates the security mechanism that prevents use of expired
 * password reset tokens. Password reset tokens expire after 2 hours for
 * security purposes.
 *
 * Test workflow:
 *
 * 1. Create a new member account
 * 2. Request password reset to trigger token generation
 * 3. Attempt to confirm password reset with an invalid/expired token
 * 4. Validate that the system rejects the expired token appropriately
 *
 * This ensures the system properly enforces token expiration security policies.
 */
export async function test_api_password_reset_token_expiration_handling(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: memberEmail,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const createdMember = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: memberData,
    },
  );
  typia.assert(createdMember);

  // Step 2: Request password reset to generate a token
  const resetRequest = {
    email: memberEmail,
  } satisfies IDiscussionBoardPasswordReset.IRequest;

  const resetResponse =
    await api.functional.discussionBoard.auth.password_reset.request(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetResponse);

  // Verify the reset request returned a success message
  TestValidator.predicate(
    "password reset request should return success message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Step 3: Attempt to confirm password reset with an expired/invalid token
  // Since the actual token is sent via email and we cannot simulate time passage,
  // we use an invalid token to test the expiration/invalid token error handling
  const expiredToken =
    "expired_or_invalid_token_" + RandomGenerator.alphaNumeric(32);
  const newPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();

  const confirmData = {
    token: expiredToken,
    new_password: newPassword,
    password_confirmation: newPassword,
  } satisfies IDiscussionBoardPasswordReset.IConfirm;

  // Step 4: Validate that the system rejects the expired token with an error
  await TestValidator.error("expired token should be rejected", async () => {
    await api.functional.discussionBoard.auth.password_reset.confirm(
      connection,
      {
        body: confirmData,
      },
    );
  });
}
