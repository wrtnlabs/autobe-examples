import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that deleting a moderator account preserves the complete account record
 * for audit trail.
 *
 * This test validates the soft deletion behavior of moderator accounts,
 * ensuring that when a moderator's privileges are revoked through deletion, all
 * account information including username and email are preserved in the
 * database for accountability and audit purposes.
 *
 * The test performs the following steps:
 *
 * 1. Register a new moderator account with identifiable credentials
 * 2. Capture the complete moderator profile information
 * 3. Execute the deletion operation
 * 4. Verify the deletion response contains all original fields plus deleted_at
 *    timestamp
 * 5. Confirm no data loss - username, email, and all other fields remain intact
 *
 * This ensures past moderation actions remain traceable to the original
 * moderator identity even after privilege revocation, supporting transparency
 * and potential appeals or audits.
 */
export async function test_api_moderator_deletion_audit_trail_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with identifiable data
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(2);
  const moderatorDisplayName = RandomGenerator.name(3);

  const registrationData = {
    email: moderatorEmail,
    password: "SecurePassword123!",
    username: moderatorUsername,
    display_name: moderatorDisplayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: registrationData,
    });
  typia.assert(createdModerator);

  // Step 2: Capture original moderator data for comparison
  const originalModeratorId = createdModerator.id;
  const originalUsername = createdModerator.username;
  const originalEmail = createdModerator.email;
  const originalDisplayName = createdModerator.display_name;
  const originalCreatedAt = createdModerator.created_at;
  const originalUpdatedAt = createdModerator.updated_at;

  // Validate the moderator was created successfully
  TestValidator.equals(
    "moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    createdModerator.username,
    moderatorUsername,
  );
  TestValidator.equals(
    "moderator display name matches",
    createdModerator.display_name,
    moderatorDisplayName,
  );

  // Step 3: Delete the moderator account
  const deletedModerator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.moderator.moderators.erase(
      connection,
      {
        moderatorId: originalModeratorId,
      },
    );
  typia.assert(deletedModerator);

  // Step 4: Verify complete audit trail preservation
  TestValidator.equals(
    "deleted moderator ID preserved",
    deletedModerator.id,
    originalModeratorId,
  );
  TestValidator.equals(
    "deleted moderator username preserved",
    deletedModerator.username,
    originalUsername,
  );
  TestValidator.equals(
    "deleted moderator email preserved",
    deletedModerator.email,
    originalEmail,
  );
  TestValidator.equals(
    "deleted moderator display_name preserved",
    deletedModerator.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "deleted moderator created_at preserved",
    deletedModerator.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "deleted moderator updated_at preserved",
    deletedModerator.updated_at,
    originalUpdatedAt,
  );

  // Step 5: Verify deleted_at timestamp is set (soft deletion indicator)
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedModerator.deleted_at !== null &&
      deletedModerator.deleted_at !== undefined,
  );

  // Verify deleted_at is a valid date-time string
  if (deletedModerator.deleted_at) {
    typia.assert<string & tags.Format<"date-time">>(
      deletedModerator.deleted_at,
    );
  }
}
