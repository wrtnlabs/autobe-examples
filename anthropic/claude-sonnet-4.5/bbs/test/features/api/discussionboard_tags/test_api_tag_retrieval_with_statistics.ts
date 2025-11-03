import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tag retrieval includes relevant metadata for user decision-making.
 *
 * This test validates that the tag detail response includes all necessary
 * metadata to help users assess tag relevance and usage in the discussion board
 * system.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create a new tag with a specific name
 * 3. Retrieve the tag by its slug using the public API
 * 4. Validate that the retrieved tag matches the created tag
 */
export async function test_api_tag_retrieval_with_statistics(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a tag with a meaningful name
  const tagName = RandomGenerator.name(2);

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Step 3: Retrieve the tag by slug to verify it can be accessed publicly
  const retrievedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(connection, {
      tagSlug: createdTag.slug,
    });
  typia.assert(retrievedTag);

  // Step 4: Validate that the retrieved tag matches the created tag
  TestValidator.equals(
    "retrieved tag ID matches created tag",
    retrievedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "retrieved tag name matches created tag",
    retrievedTag.name,
    createdTag.name,
  );
  TestValidator.equals(
    "retrieved tag slug matches created tag",
    retrievedTag.slug,
    createdTag.slug,
  );
  TestValidator.equals(
    "retrieved tag created_at matches",
    retrievedTag.created_at,
    createdTag.created_at,
  );
  TestValidator.equals(
    "retrieved tag updated_at matches",
    retrievedTag.updated_at,
    createdTag.updated_at,
  );
}
