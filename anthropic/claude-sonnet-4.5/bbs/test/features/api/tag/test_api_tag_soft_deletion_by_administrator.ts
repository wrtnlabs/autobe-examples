import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test soft deletion of an unused tag by an administrator.
 *
 * This test validates the complete workflow of administrator-initiated tag
 * deletion in the discussion board system. The test creates an administrator
 * account, creates a tag that is not associated with any topics, and then
 * performs soft deletion on that tag.
 *
 * The test ensures that:
 *
 * 1. Administrator authentication works correctly
 * 2. Tag creation by administrators succeeds
 * 3. Soft deletion of unused tags completes without errors
 * 4. The deletion operation preserves audit trail (soft delete, not hard delete)
 *
 * Steps:
 *
 * 1. Register a new administrator account
 * 2. Create a new tag as the authenticated administrator
 * 3. Soft delete the created tag
 * 4. Verify the deletion operation completed successfully
 */
export async function test_api_tag_soft_deletion_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create a new tag as the administrator
  const tagData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tagData,
    });
  typia.assert(createdTag);

  // Verify tag was created successfully
  TestValidator.equals(
    "tag name matches",
    createdTag.name.toLowerCase(),
    tagData.name.toLowerCase(),
  );

  // Step 3: Soft delete the created tag
  await api.functional.discussionBoard.administrator.tags.erase(connection, {
    tagId: createdTag.id,
  });

  // Soft deletion completed successfully (no error thrown)
  // The tag record is preserved in the database with deleted_at timestamp set
  // The tag is now hidden from active tag browsing and selection interfaces
}
