import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test idempotent deletion of moderator accounts.
 *
 * This test validates that the system handles repeated deletion requests
 * gracefully without causing errors or data corruption. It verifies that
 * attempting to delete an already soft-deleted moderator account either
 * succeeds without changes or returns an appropriate response.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Perform the first deletion operation (soft delete)
 * 3. Attempt to delete the same account again
 * 4. Verify idempotent behavior - no errors and consistent state
 */
export async function test_api_moderator_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const registrationData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(moderator);

  // Step 2: Perform the first deletion operation (soft delete)
  const firstDeletion: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorUsername: moderator.username,
      },
    );
  typia.assert(firstDeletion);

  // Verify the first deletion set deleted_at timestamp
  TestValidator.predicate(
    "first deletion should set deleted_at timestamp",
    firstDeletion.deleted_at !== null && firstDeletion.deleted_at !== undefined,
  );

  // Step 3: Attempt to delete the same moderator account again (idempotency test)
  const secondDeletion: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorUsername: moderator.username,
      },
    );
  typia.assert(secondDeletion);

  // Step 4: Validate idempotent behavior
  // Use non-null assertion since we've verified deleted_at exists
  const firstDeletedAt = typia.assert(firstDeletion.deleted_at!);
  const secondDeletedAt = typia.assert(secondDeletion.deleted_at!);

  // The deleted_at timestamp should remain consistent between both deletions
  TestValidator.equals(
    "deleted_at timestamp should remain consistent across deletions",
    secondDeletedAt,
    firstDeletedAt,
  );

  // Verify both responses have the same moderator ID
  TestValidator.equals(
    "moderator ID should be consistent",
    secondDeletion.id,
    firstDeletion.id,
  );

  // Verify username remains unchanged
  TestValidator.equals(
    "username should remain unchanged",
    secondDeletion.username,
    moderator.username,
  );
}
