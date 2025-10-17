import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tags can be created with optional description metadata.
 *
 * This test validates that discussion board tags support optional description
 * fields that provide context about tag semantics and appropriate usage.
 * Description metadata helps users understand tag meanings and apply tags
 * consistently across economic and political discussions.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator via join
 * 2. Create first tag with name only (no description)
 * 3. Create second tag with both name and comprehensive description
 * 4. Validate both tags created successfully
 * 5. Verify tag without description has null/undefined description field
 * 6. Verify tag with description stores complete description text
 */
export async function test_api_tag_creation_with_description_metadata(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        appointed_by_admin_id: adminId,
        username: RandomGenerator.alphaNumeric(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first tag without description
  const tagNameOnly = RandomGenerator.alphaNumeric(8);
  const tagWithoutDescription: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagNameOnly,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tagWithoutDescription);

  // Step 3: Create second tag with description
  const tagNameWithDesc = RandomGenerator.alphaNumeric(10);
  const descriptionText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const tagWithDescription: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagNameWithDesc,
        description: descriptionText,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tagWithDescription);

  // Step 4: Validate both tags created successfully with basic properties
  TestValidator.equals(
    "tag without description has correct normalized name",
    tagWithoutDescription.name,
    tagNameOnly.toLowerCase(),
  );
  TestValidator.equals(
    "tag with description has correct normalized name",
    tagWithDescription.name,
    tagNameWithDesc.toLowerCase(),
  );

  TestValidator.predicate(
    "tag without description has valid UUID id",
    typeof tagWithoutDescription.id === "string" &&
      tagWithoutDescription.id.length > 0,
  );
  TestValidator.predicate(
    "tag with description has valid UUID id",
    typeof tagWithDescription.id === "string" &&
      tagWithDescription.id.length > 0,
  );

  // Step 5: Validate tag without description has null or undefined description
  TestValidator.predicate(
    "tag without description has null or undefined description field",
    tagWithoutDescription.description === null ||
      tagWithoutDescription.description === undefined,
  );

  // Step 6: Validate tag with description stores complete description text
  TestValidator.predicate(
    "tag with description has non-null description",
    tagWithDescription.description !== null &&
      tagWithDescription.description !== undefined,
  );

  if (
    tagWithDescription.description !== null &&
    tagWithDescription.description !== undefined
  ) {
    TestValidator.equals(
      "tag with description stores complete description text",
      tagWithDescription.description,
      descriptionText,
    );
  }
}
