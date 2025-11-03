import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * E2E: Moderator profile update
 *
 * This test verifies that a moderator can update allowed profile fields (email
 * and displayName) after creating an account. Because the update endpoint
 * returns an ISummary (which does not include email), the test asserts that the
 * display_name was updated and that username remains unchanged. It also checks
 * that no sensitive field (password_hash) is present in the returned summary.
 *
 * Workflow:
 *
 * 1. Create a new moderator with POST /auth/moderator/join (ICreate) to obtain
 *    authentication tokens (IAuthorized). The SDK will set the connection's
 *    Authorization header automatically.
 * 2. Call PUT /discussionBoard/moderator/moderators/{moderatorUsername} with
 *    IDiscussionBoardModerator.IUpdate payload to change email and
 *    displayName.
 * 3. Validate the returned ISummary: username unchanged, display_name updated, and
 *    no password_hash present.
 */
export async function test_api_moderator_profile_update(
  connection: api.IConnection,
) {
  // 1) Prepare and create a new moderator account
  const createBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    // Ensure minimum 12 characters for password; add a symbol and uppercase to satisfy complexity policy
    password: RandomGenerator.alphaNumeric(11) + "A!",
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorized: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2) Prepare update payload (change email and displayName)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newDisplayName = RandomGenerator.name();

  const updateBody = {
    email: newEmail,
    displayName: newDisplayName,
  } satisfies IDiscussionBoardModerator.IUpdate;

  // 3) Execute update (authenticated by SDK after join)
  const summary: IDiscussionBoardModerator.ISummary =
    await api.functional.discussionBoard.moderator.moderators.update(
      connection,
      {
        moderatorUsername: createBody.username,
        body: updateBody,
      },
    );
  typia.assert(summary);

  // 4) Business assertions
  TestValidator.equals(
    "username should remain unchanged",
    summary.username,
    createBody.username,
  );

  TestValidator.equals(
    "display_name should be updated",
    summary.display_name,
    newDisplayName,
  );

  // Ensure no sensitive credential field leaked in the summary
  TestValidator.predicate(
    "response must not contain password_hash",
    !("password_hash" in (summary as Record<string, unknown>)),
  );
}
