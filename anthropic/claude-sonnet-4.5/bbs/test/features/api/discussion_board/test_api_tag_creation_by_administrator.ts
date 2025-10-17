import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test administrator tag creation workflow in the discussion board system.
 *
 * This test validates that administrators can create new tags with active
 * status immediately available for use. It verifies tag name normalization to
 * lowercase, proper timestamp generation, unique identifier assignment, and the
 * ability to add optional descriptions for tag semantics.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as an administrator
 * 2. Create a new tag with valid name and description
 * 3. Verify tag creation response contains all required fields
 * 4. Validate tag name normalization and description preservation
 */
export async function test_api_tag_creation_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as administrator
  const adminData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(adminAuth);

  // Step 2: Create a new tag with valid name and description
  const tagName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const tagDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const tagData = {
    name: tagName,
    description: tagDescription,
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.administrator.tags.create(connection, {
      body: tagData,
    });
  typia.assert(createdTag);

  // Step 3: Verify tag name is normalized to lowercase
  TestValidator.equals(
    "tag name should be normalized to lowercase",
    createdTag.name,
    tagName.toLowerCase(),
  );

  // Step 4: Verify description is preserved
  TestValidator.equals(
    "tag description should match input",
    createdTag.description,
    tagDescription,
  );
}
