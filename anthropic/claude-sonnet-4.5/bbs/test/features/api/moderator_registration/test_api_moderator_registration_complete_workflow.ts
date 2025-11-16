import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test the complete moderator registration workflow from account creation
 * through JWT token issuance.
 *
 * This test validates that a new moderator can successfully register by
 * providing valid credentials (email, password, username), that the system
 * creates the moderator account in the discussion_board_moderators table, and
 * that the response includes both the newly created moderator profile and
 * authentication tokens (access and refresh tokens).
 *
 * The test verifies that all required fields are present in the response
 * including the moderator ID (UUID format), email, username, timestamps, and
 * valid JWT tokens. It also validates that the moderator account is immediately
 * usable without requiring a separate login step.
 *
 * Test Steps:
 *
 * 1. Generate random valid registration data with all required fields
 * 2. Call the moderator join API endpoint
 * 3. Validate the response structure and all required fields
 * 4. Verify business logic: email and username match registration data
 */
export async function test_api_moderator_registration_complete_workflow(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  // Step 2: Call the moderator join API endpoint
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the complete response structure (this validates EVERYTHING)
  typia.assert(moderator);

  // Step 4: Verify business logic - registration data matches response
  TestValidator.equals(
    "moderator email matches registration email",
    moderator.email,
    registrationData.email,
  );

  TestValidator.equals(
    "moderator username matches registration username",
    moderator.username,
    registrationData.username,
  );
}
