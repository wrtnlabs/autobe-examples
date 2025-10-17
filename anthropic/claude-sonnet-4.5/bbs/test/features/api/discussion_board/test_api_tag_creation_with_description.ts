import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validates tag creation with optional description metadata.
 *
 * This test demonstrates the tag system's support for enhanced metadata beyond
 * just tag names. Administrators can provide descriptive explanations that
 * clarify tag semantics and guide proper usage across the discussion board
 * platform.
 *
 * Test workflow:
 *
 * 1. Create administrator account with tag management permissions
 * 2. Create a tag with both name and description fields populated
 * 3. Verify the created tag includes the description in the response
 * 4. Validate business logic properties match expected values
 */
export async function test_api_tag_creation_with_description(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with tag management permissions
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

  // Step 2: Create a tag with comprehensive description
  const tagName = RandomGenerator.name(2);
  const tagDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
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

  // Step 3: Verify the created tag includes the description (business logic validation)
  TestValidator.equals(
    "tag name matches input and is normalized to lowercase",
    createdTag.name,
    tagName.toLowerCase(),
  );

  TestValidator.equals(
    "tag description matches input",
    createdTag.description,
    tagDescription,
  );
}
