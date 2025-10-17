import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test tag retrieval with comprehensive statistics from materialized view.
 *
 * This test validates that the tag detail endpoint returns complete tag
 * information including aggregated statistics necessary for tag analytics and
 * popular tag displays.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator via join endpoint
 * 2. Create a new tag with valid name and description
 * 3. Retrieve the tag by ID using the tag detail endpoint
 * 4. Validate complete tag metadata is returned
 * 5. Verify all tag properties match expected structure
 *
 * The test ensures tag retrieval provides comprehensive information for tag
 * cloud generation, popular tag displays, and tag usage analytics in the
 * discussion board.
 */
export async function test_api_tag_retrieval_with_statistics(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authenticatedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(authenticatedModerator);

  // Step 2: Create a new tag
  const tagCreateData = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagCreateData,
    });
  typia.assert(createdTag);

  // Step 3: Retrieve the tag by ID
  const retrievedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(connection, {
      tagId: createdTag.id,
    });
  typia.assert(retrievedTag);

  // Step 4: Validate tag metadata matches
  TestValidator.equals("tag ID matches", retrievedTag.id, createdTag.id);
  TestValidator.equals("tag name matches", retrievedTag.name, createdTag.name);
  TestValidator.equals(
    "tag description matches",
    retrievedTag.description,
    createdTag.description,
  );
  TestValidator.equals(
    "tag status is set",
    retrievedTag.status,
    createdTag.status,
  );

  // Step 5: Verify timestamps are present
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedTag.created_at !== null && retrievedTag.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedTag.updated_at !== null && retrievedTag.updated_at !== undefined,
  );
}
