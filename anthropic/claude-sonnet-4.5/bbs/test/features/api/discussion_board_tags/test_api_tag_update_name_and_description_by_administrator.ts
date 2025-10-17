import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test administrator's ability to update tag name and description.
 *
 * This test validates the complete tag update workflow for administrators,
 * ensuring that tag names are properly normalized to lowercase, descriptions
 * can be modified, and the updated_at timestamp is refreshed appropriately.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as an administrator
 * 2. Create an initial tag with original name and description
 * 3. Update the tag with new name and description
 * 4. Verify all updates were applied correctly
 * 5. Confirm tag normalization rules are followed
 */
export async function test_api_tag_update_name_and_description_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register administrator account
  const adminRegistration = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const administrator: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminRegistration,
    });
  typia.assert(administrator);

  // Step 2: Create initial tag
  const originalTagName = "Initial Tag Name";
  const originalDescription = "This is the original description for the tag";

  const createTagBody = {
    name: originalTagName,
    description: originalDescription,
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: createTagBody,
    });
  typia.assert(createdTag);

  // Verify tag was created with normalized name (lowercase)
  TestValidator.equals(
    "created tag name should be normalized to lowercase",
    createdTag.name,
    originalTagName.toLowerCase(),
  );
  TestValidator.equals(
    "created tag description should match",
    createdTag.description,
    originalDescription,
  );

  // Step 3: Update tag with new name and description
  const updatedTagName = "Updated Tag Name";
  const updatedDescription = "This is the updated description for the tag";

  const updateTagBody = {
    name: updatedTagName,
    description: updatedDescription,
  } satisfies IDiscussionBoardTag.IUpdate;

  const updatedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: createdTag.id,
      body: updateTagBody,
    });
  typia.assert(updatedTag);

  // Step 4: Validate all updates were applied correctly
  TestValidator.equals(
    "tag ID should remain unchanged",
    updatedTag.id,
    createdTag.id,
  );

  TestValidator.equals(
    "updated tag name should be normalized to lowercase",
    updatedTag.name,
    updatedTagName.toLowerCase(),
  );

  TestValidator.equals(
    "updated tag description should match new value",
    updatedTag.description,
    updatedDescription,
  );

  // Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp should be later than or equal to created_at",
    new Date(updatedTag.updated_at).getTime() >=
      new Date(createdTag.created_at).getTime(),
  );

  // Verify other properties remain consistent
  TestValidator.equals(
    "tag status should remain unchanged",
    updatedTag.status,
    createdTag.status,
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedTag.created_at,
    createdTag.created_at,
  );
}
