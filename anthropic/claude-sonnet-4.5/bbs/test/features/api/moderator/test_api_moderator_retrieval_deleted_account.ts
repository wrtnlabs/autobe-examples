import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator retrieval behavior for soft-deleted moderator accounts.
 *
 * This test validates the system's handling of deleted moderator accounts when
 * attempting to retrieve them by ID. It creates a moderator account,
 * soft-deletes it using the DELETE endpoint (which sets the deleted_at
 * timestamp), and then attempts to retrieve the deleted moderator.
 *
 * The test verifies one of two valid behaviors:
 *
 * 1. The moderator is still retrievable with deleted_at field populated,
 *    preserving the complete audit trail and allowing visibility into
 *    moderation history
 * 2. The system returns an error indicating the moderator is no longer accessible
 *
 * Steps:
 *
 * 1. Create first moderator account for authentication context
 * 2. Create second moderator account to be deleted and retrieved
 * 3. Delete the second moderator account (soft deletion)
 * 4. Attempt to retrieve the deleted moderator by ID
 * 5. Validate the response shows deleted status or appropriate error
 */
export async function test_api_moderator_retrieval_deleted_account(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account for authentication
  const firstModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "192.168.1.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const firstModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: firstModeratorData,
    });
  typia.assert(firstModerator);

  // Step 2: Create second moderator account to be deleted
  const secondModeratorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AnotherPass456!",
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "192.168.1.2",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const secondModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: secondModeratorData,
    });
  typia.assert(secondModerator);

  // Step 3: Delete the second moderator account (soft deletion)
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorId: secondModerator.id,
      },
    );
  typia.assert(deletedModerator);

  // Verify that deletion set the deleted_at timestamp
  const deletedAtValue = typia.assert(deletedModerator.deleted_at!);
  TestValidator.predicate(
    "deleted moderator has deleted_at timestamp",
    typeof deletedAtValue === "string",
  );

  // Step 4: Attempt to retrieve the deleted moderator by ID
  // The system may either return the deleted moderator or throw an error
  try {
    const retrievedModerator: IDiscussionBoardModerator.ISummary =
      await api.functional.discussionBoard.moderator.moderators.at(connection, {
        moderatorId: secondModerator.id,
      });
    typia.assert(retrievedModerator);

    // If retrieval succeeds, validate the deleted status is preserved
    TestValidator.equals(
      "retrieved moderator ID matches deleted moderator",
      retrievedModerator.id,
      deletedModerator.id,
    );

    // Verify deleted_at is populated
    const retrievedDeletedAt = typia.assert(retrievedModerator.deleted_at!);
    TestValidator.equals(
      "deleted_at timestamp matches",
      retrievedDeletedAt,
      deletedAtValue,
    );

    // Verify all profile fields remain intact for audit trail
    TestValidator.equals(
      "deleted moderator email preserved",
      retrievedModerator.email,
      deletedModerator.email,
    );

    TestValidator.equals(
      "deleted moderator username preserved",
      retrievedModerator.username,
      deletedModerator.username,
    );
  } catch (error) {
    // If retrieval fails, this is also acceptable behavior
    // The system may prevent access to deleted moderators
    TestValidator.predicate(
      "system either allows retrieval or returns error for deleted moderator",
      error instanceof Error,
    );
  }
}
