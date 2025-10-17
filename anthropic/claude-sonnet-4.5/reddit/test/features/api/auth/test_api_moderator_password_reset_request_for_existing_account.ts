import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test the password reset request workflow for an existing moderator account.
 *
 * This test validates that the password reset request functionality works
 * correctly for moderators who have already registered in the system. The test
 * creates a new moderator account, then requests a password reset using the
 * registered email address, and verifies that the system responds with a
 * success confirmation.
 *
 * Steps:
 *
 * 1. Create a new moderator account through registration
 * 2. Request password reset using the registered email address
 * 3. Validate the success response structure
 * 4. Confirm that appropriate confirmation message is returned
 */
export async function test_api_moderator_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies IRedditLikeModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // Step 2: Request password reset for the existing moderator account
  const resetResponse =
    await api.functional.auth.moderator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies IRedditLikeModerator.IPasswordResetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 3: Validate the response structure
  TestValidator.equals(
    "password reset response should have success flag set to true",
    resetResponse.success,
    true,
  );

  // Step 4: Validate that a confirmation message is present
  TestValidator.predicate(
    "password reset response should contain a confirmation message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );
}
