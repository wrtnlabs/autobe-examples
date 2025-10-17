import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test tag name update format validation enforcement.
 *
 * Validates that tag name updates properly enforce naming convention
 * requirements. Creates an administrator account, creates a valid tag, then
 * attempts various invalid name updates to verify validation works correctly.
 * Finally confirms that valid updates succeed.
 *
 * Test workflow:
 *
 * 1. Create administrator account and authenticate
 * 2. Create a valid tag with proper name format
 * 3. Attempt update with too short name (< 2 characters) - should fail
 * 4. Attempt update with too long name (> 30 characters) - should fail
 * 5. Attempt update with invalid characters - should fail
 * 6. Successfully update with valid name format
 * 7. Verify tag was updated correctly
 */
export async function test_api_tag_update_name_format_validation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
      } satisfies IDiscussionBoardAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a valid tag with proper name format
  const originalTagName = "valid-tag-name";
  const tagDescription = "A valid tag for testing name validation";

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: {
        name: originalTagName,
        description: tagDescription,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  TestValidator.equals(
    "created tag name matches input",
    createdTag.name,
    originalTagName,
  );

  // Step 3: Attempt update with too short name (< 2 characters) - should fail
  await TestValidator.error(
    "tag name update with too short name should fail",
    async () => {
      await api.functional.discussionBoard.administrator.tags.update(
        connection,
        {
          tagId: createdTag.id,
          body: {
            name: "a",
          } satisfies IDiscussionBoardTag.IUpdate,
        },
      );
    },
  );

  // Step 4: Attempt update with too long name (> 30 characters) - should fail
  const tooLongName = RandomGenerator.alphabets(31);

  await TestValidator.error(
    "tag name update with too long name should fail",
    async () => {
      await api.functional.discussionBoard.administrator.tags.update(
        connection,
        {
          tagId: createdTag.id,
          body: {
            name: tooLongName,
          } satisfies IDiscussionBoardTag.IUpdate,
        },
      );
    },
  );

  // Step 5: Attempt update with invalid characters - should fail
  const invalidCharsName = "invalid@tag#name!";

  await TestValidator.error(
    "tag name update with invalid characters should fail",
    async () => {
      await api.functional.discussionBoard.administrator.tags.update(
        connection,
        {
          tagId: createdTag.id,
          body: {
            name: invalidCharsName,
          } satisfies IDiscussionBoardTag.IUpdate,
        },
      );
    },
  );

  // Step 6: Successfully update with valid name format
  const validNewName = "updated-valid-tag";

  const updatedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.update(connection, {
      tagId: createdTag.id,
      body: {
        name: validNewName,
      } satisfies IDiscussionBoardTag.IUpdate,
    });
  typia.assert(updatedTag);

  // Step 7: Verify tag was updated correctly
  TestValidator.equals(
    "tag name successfully updated with valid format",
    updatedTag.name,
    validNewName,
  );

  TestValidator.equals(
    "tag ID remains the same after update",
    updatedTag.id,
    createdTag.id,
  );

  TestValidator.equals(
    "tag description unchanged when not updated",
    updatedTag.description,
    tagDescription,
  );
}
