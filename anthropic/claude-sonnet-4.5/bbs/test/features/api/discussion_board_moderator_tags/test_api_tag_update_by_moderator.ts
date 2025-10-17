import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a moderator updating an existing tag's
 * properties.
 *
 * This test validates that moderators can modify tags they or administrators
 * created, that updated names are validated for uniqueness and proper format,
 * that descriptions can be added or modified to improve tag clarity, and that
 * status changes control tag lifecycle (pending_review to active for approval,
 * active to disabled to hide from selection, active to merged for tag
 * consolidation).
 *
 * The test workflow:
 *
 * 1. Create and authenticate as a moderator
 * 2. Create an initial tag with basic properties
 * 3. Update the tag's name to a new unique value
 * 4. Add/modify the tag's description for better semantics
 * 5. Change the tag's status to test lifecycle management
 * 6. Verify all modifications were properly persisted
 */
export async function test_api_tag_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a moderator
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorData = {
    appointed_by_admin_id: adminId,
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create an initial tag with basic properties
  const initialTagName = RandomGenerator.name(2);
  const initialTagData = {
    name: initialTagName,
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: initialTagData,
    });
  typia.assert(createdTag);

  TestValidator.equals(
    "created tag name should match input (normalized to lowercase)",
    createdTag.name,
    initialTagName.toLowerCase(),
  );

  // Step 3: Update the tag's name to a new unique value
  const updatedTagName = RandomGenerator.name(2);
  const nameUpdateData = {
    name: updatedTagName,
  } satisfies IDiscussionBoardTag.IUpdate;

  const tagAfterNameUpdate: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: nameUpdateData,
    });
  typia.assert(tagAfterNameUpdate);

  TestValidator.equals(
    "updated tag name should reflect new value (normalized)",
    tagAfterNameUpdate.name,
    updatedTagName.toLowerCase(),
  );
  TestValidator.equals(
    "tag ID should remain unchanged after name update",
    tagAfterNameUpdate.id,
    createdTag.id,
  );

  // Step 4: Add/modify the tag's description for better semantics
  const enhancedDescription = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 10,
  });
  const descriptionUpdateData = {
    description: enhancedDescription,
  } satisfies IDiscussionBoardTag.IUpdate;

  const tagAfterDescriptionUpdate: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: descriptionUpdateData,
    });
  typia.assert(tagAfterDescriptionUpdate);

  TestValidator.equals(
    "updated tag description should reflect new value",
    tagAfterDescriptionUpdate.description,
    enhancedDescription,
  );
  TestValidator.equals(
    "tag name should remain unchanged after description update",
    tagAfterDescriptionUpdate.name,
    updatedTagName.toLowerCase(),
  );

  // Step 5: Change the tag's status to test lifecycle management
  const statuses = ["active", "pending_review", "disabled", "merged"] as const;
  const newStatus = RandomGenerator.pick(statuses);
  const statusUpdateData = {
    status: newStatus,
  } satisfies IDiscussionBoardTag.IUpdate;

  const tagAfterStatusUpdate: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: statusUpdateData,
    });
  typia.assert(tagAfterStatusUpdate);

  TestValidator.equals(
    "updated tag status should reflect new value",
    tagAfterStatusUpdate.status,
    newStatus,
  );

  // Step 6: Verify all modifications were properly persisted
  TestValidator.equals(
    "tag ID should remain consistent across all updates",
    tagAfterStatusUpdate.id,
    createdTag.id,
  );

  TestValidator.predicate(
    "updated_at timestamp should be after or equal to created_at",
    new Date(tagAfterStatusUpdate.updated_at) >=
      new Date(tagAfterStatusUpdate.created_at),
  );

  // Perform a comprehensive update with all fields at once
  const finalTagName = RandomGenerator.name(2);
  const finalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const finalStatus = RandomGenerator.pick(statuses);

  const finalUpdateData = {
    name: finalTagName,
    description: finalDescription,
    status: finalStatus,
  } satisfies IDiscussionBoardTag.IUpdate;

  const finalUpdatedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: finalUpdateData,
    });
  typia.assert(finalUpdatedTag);

  TestValidator.equals(
    "final tag name should reflect comprehensive update",
    finalUpdatedTag.name,
    finalTagName.toLowerCase(),
  );
  TestValidator.equals(
    "final tag description should reflect comprehensive update",
    finalUpdatedTag.description,
    finalDescription,
  );
  TestValidator.equals(
    "final tag status should reflect comprehensive update",
    finalUpdatedTag.status,
    finalStatus,
  );
  TestValidator.equals(
    "tag ID should remain unchanged after comprehensive update",
    finalUpdatedTag.id,
    createdTag.id,
  );
}
