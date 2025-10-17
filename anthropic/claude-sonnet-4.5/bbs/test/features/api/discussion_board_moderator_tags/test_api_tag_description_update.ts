import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the workflow for moderators to add or modify tag descriptions.
 *
 * This test validates that descriptions can be added to tags initially created
 * without descriptions, that existing descriptions can be updated with improved
 * explanatory text, and that description changes are properly saved with
 * updated timestamps.
 *
 * Workflow:
 *
 * 1. Register a moderator account with administrator reference
 * 2. Create a tag without description
 * 3. Update the tag to add a comprehensive description
 * 4. Verify the description was stored and updated_at timestamp changed
 */
export async function test_api_tag_description_update(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();

  const moderatorData = {
    appointed_by_admin_id: adminId,
    username: RandomGenerator.alphaNumeric(10),
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a tag without description
  const tagName = RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-");

  const tagCreateData = {
    name: tagName,
    description: undefined,
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagCreateData,
    });
  typia.assert(createdTag);

  // Verify tag was created without description
  TestValidator.predicate(
    "tag created without description",
    createdTag.description === null || createdTag.description === undefined,
  );

  // Step 3: Update tag to add comprehensive description
  const newDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const tagUpdateData = {
    description: newDescription,
  } satisfies IDiscussionBoardTag.IUpdate;

  const updatedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.update(connection, {
      tagId: createdTag.id,
      body: tagUpdateData,
    });
  typia.assert(updatedTag);

  // Step 4: Verify description was added and tag properties preserved
  TestValidator.equals(
    "tag ID unchanged after update",
    updatedTag.id,
    createdTag.id,
  );

  TestValidator.equals(
    "tag name unchanged after update",
    updatedTag.name,
    createdTag.name,
  );

  TestValidator.equals(
    "description successfully added",
    updatedTag.description,
    newDescription,
  );

  TestValidator.predicate(
    "updated_at timestamp changed",
    new Date(updatedTag.updated_at).getTime() >
      new Date(createdTag.updated_at).getTime(),
  );

  TestValidator.predicate(
    "description is not null or undefined",
    updatedTag.description !== null && updatedTag.description !== undefined,
  );
}
