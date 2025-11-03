import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow for updating an existing tag by its slug
 * identifier.
 *
 * This test validates that moderators can successfully modify tag properties
 * while maintaining referential integrity in the discussion board system.
 *
 * Workflow:
 *
 * 1. Create a new moderator account via join operation
 * 2. Create an initial tag with name 'economic-policy'
 * 3. Update the tag name to 'fiscal-policy' using the tag's slug
 * 4. Verify that the tag is updated successfully
 * 5. Confirm that the updated_at timestamp is modified
 * 6. Validate that the slug is regenerated based on the new name
 */
export async function test_api_tag_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create initial tag with name 'economic-policy'
  const initialTagData = {
    name: "economic-policy",
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: initialTagData,
    });
  typia.assert(createdTag);

  // Verify initial tag creation
  TestValidator.equals(
    "initial tag name is normalized to lowercase",
    createdTag.name,
    "economic-policy",
  );
  TestValidator.predicate("initial tag has a slug", createdTag.slug.length > 0);

  // Store the original slug and timestamps for comparison
  const originalSlug = createdTag.slug;
  const originalUpdatedAt = createdTag.updated_at;

  // Step 3: Update the tag name to 'fiscal-policy' using the tag's slug
  const updateData = {
    name: "fiscal-policy",
  } satisfies IDiscussionBoardTag.IUpdate;

  const updatedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagSlug: originalSlug,
      body: updateData,
    });
  typia.assert(updatedTag);

  // Step 4: Verify that the tag is updated successfully
  TestValidator.equals(
    "tag ID remains the same after update",
    updatedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "tag name is updated and normalized to lowercase",
    updatedTag.name,
    "fiscal-policy",
  );

  // Step 5: Confirm that the updated_at timestamp is modified
  TestValidator.predicate(
    "updated_at timestamp is modified after update",
    new Date(updatedTag.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 6: Validate that the slug is regenerated based on the new name
  TestValidator.predicate(
    "slug is regenerated after name change",
    updatedTag.slug !== originalSlug,
  );
  TestValidator.predicate(
    "new slug reflects the updated name",
    updatedTag.slug.includes("fiscal"),
  );
}
