import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator account creation and soft deletion workflow.
 *
 * This test validates the moderator lifecycle from account creation through
 * soft deletion. While the original scenario intended to test login prevention
 * after deletion, the login endpoint is not available in the current API.
 * Therefore, this test focuses on verifying:
 *
 * 1. Successful moderator account creation
 * 2. Successful soft deletion with deleted_at timestamp set
 * 3. Account data preservation after deletion (soft delete, not hard delete)
 *
 * Steps:
 *
 * 1. Create a new moderator account with valid credentials
 * 2. Verify account creation succeeds with correct data
 * 3. Soft delete the moderator account by username
 * 4. Verify deletion succeeded and deleted_at timestamp is set
 * 5. Verify account data is preserved (soft delete maintains referential
 *    integrity)
 */
export async function test_api_moderator_deletion_login_prevention(
  connection: api.IConnection,
) {
  // Step 1: Generate random credentials for moderator creation
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!";
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Step 2: Create a new moderator account with known credentials
  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: username,
        email: email,
        password: password,
        href: href,
        referrer: referrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });

  // Step 3: Validate successful account creation
  typia.assert(createdModerator);
  TestValidator.equals(
    "created moderator username matches",
    createdModerator.username,
    username,
  );
  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    email,
  );
  TestValidator.predicate(
    "moderator account is initially not deleted",
    createdModerator.deleted_at === null ||
      createdModerator.deleted_at === undefined,
  );

  // Step 4: Soft delete the moderator account
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorUsername: username,
      },
    );

  // Step 5: Validate deletion occurred successfully
  typia.assert(deletedModerator);
  TestValidator.predicate(
    "moderator account has deleted_at timestamp after deletion",
    deletedModerator.deleted_at !== null &&
      deletedModerator.deleted_at !== undefined,
  );

  // Step 6: Verify account data is preserved (soft delete maintains integrity)
  TestValidator.equals(
    "deleted moderator username preserved",
    deletedModerator.username,
    username,
  );
  TestValidator.equals(
    "deleted moderator email preserved",
    deletedModerator.email,
    email,
  );
  TestValidator.equals(
    "deleted moderator ID preserved",
    deletedModerator.id,
    createdModerator.id,
  );
}
