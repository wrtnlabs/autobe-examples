import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tags can be retrieved publicly after being created by moderators.
 *
 * This test validates the complete tag lifecycle from creation through public
 * access. It ensures that tags created by moderators become publicly
 * accessible, supporting the platform's tag-based content discovery system.
 *
 * Workflow:
 *
 * 1. Authenticate as moderator via join (new user context)
 * 2. Create a new tag with name, description, and initial status
 * 3. Retrieve the created tag by its ID without authentication (public access)
 * 4. Validate that tag information is accessible including name, description,
 *    status, and metadata
 * 5. Verify that the tag data returned matches the created tag details
 *
 * Validation points:
 *
 * - Tag can be created successfully by moderator
 * - Tag ID is generated and returned
 * - Public retrieval works without authentication
 * - Tag name, description, and status are correctly returned
 * - Timestamps (created_at, updated_at) are present
 * - Tag statistics are included if available
 */
export async function test_api_tag_public_retrieval_after_moderator_creation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator via join
  const moderatorData = {
    appointed_by_admin_id: typia.random<string & tags.Format<"uuid">>(),
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);
  typia.assert(moderator.token);
  typia.assert(moderator.id);

  // Step 2: Create a new tag with name and description
  const tagData = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardTag.ICreate;

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: tagData,
    });
  typia.assert(createdTag);

  // Step 3: Retrieve the tag by ID using public access (without authentication)
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  const retrievedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(publicConnection, {
      tagId: createdTag.id,
    });
  typia.assert(retrievedTag);

  // Step 4: Validate that tag information matches
  TestValidator.equals("tag ID matches", retrievedTag.id, createdTag.id);
  TestValidator.equals("tag name matches", retrievedTag.name, createdTag.name);
  TestValidator.equals(
    "tag description matches",
    retrievedTag.description,
    createdTag.description,
  );
  TestValidator.equals(
    "tag status matches",
    retrievedTag.status,
    createdTag.status,
  );
  TestValidator.equals(
    "tag created_at matches",
    retrievedTag.created_at,
    createdTag.created_at,
  );
  TestValidator.equals(
    "tag updated_at matches",
    retrievedTag.updated_at,
    createdTag.updated_at,
  );

  // Step 5: Verify timestamps are present and valid
  TestValidator.predicate(
    "created_at is valid timestamp",
    retrievedTag.created_at !== null && retrievedTag.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    retrievedTag.updated_at !== null && retrievedTag.updated_at !== undefined,
  );
}
