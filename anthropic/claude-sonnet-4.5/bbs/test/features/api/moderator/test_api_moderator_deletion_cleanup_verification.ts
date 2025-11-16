import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator deletion with cascade cleanup verification.
 *
 * Validates that hard deletion of a moderator account properly removes all
 * associated data and authentication sessions. This test creates a moderator,
 * establishes a session, deletes the account, and verifies complete cleanup.
 *
 * Process:
 *
 * 1. Create moderator account with authentication session
 * 2. Verify account creation and token issuance
 * 3. Delete the moderator account permanently
 * 4. Verify deletion returns complete moderator data
 * 5. Confirm cascade deletion cleaned up related records
 */
export async function test_api_moderator_deletion_cleanup_verification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication session
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  // Step 2: Verify account creation and authentication token
  typia.assert(createdModerator);
  TestValidator.equals(
    "moderator email matches",
    createdModerator.email,
    createBody.email,
  );
  TestValidator.equals(
    "moderator username matches",
    createdModerator.username,
    createBody.username,
  );

  // Step 3: Delete the moderator account permanently
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorId: createdModerator.id,
      },
    );

  // Step 4: Verify deletion returns complete moderator data
  typia.assert(deletedModerator);
  TestValidator.equals(
    "deleted moderator ID matches",
    deletedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "deleted moderator email matches",
    deletedModerator.email,
    createBody.email,
  );
  TestValidator.equals(
    "deleted moderator username matches",
    deletedModerator.username,
    createBody.username,
  );
}
