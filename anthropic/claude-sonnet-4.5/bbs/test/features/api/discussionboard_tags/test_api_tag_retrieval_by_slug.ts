import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test retrieving detailed information for a specific tag by its unique slug
 * identifier.
 *
 * This test validates the complete tag retrieval workflow in the discussion
 * board system. It verifies that a moderator can create a tag and then retrieve
 * it by its slug to confirm all tag metadata is correctly returned including
 * tag name, URL-friendly slug, timestamps, and that the slug-based lookup
 * functions properly for content discovery.
 *
 * Test Flow:
 *
 * 1. Register and authenticate as a new moderator
 * 2. Create a new tag through the moderator endpoint with a random tag name
 * 3. Retrieve the created tag by its slug using the public tag retrieval endpoint
 * 4. Validate all tag properties match between creation and retrieval
 * 5. Verify slug-based lookup returns the correct tag details
 */
export async function test_api_tag_retrieval_by_slug(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new tag through the moderator endpoint
  const tagName = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<30>
    >(),
  );

  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Step 3: Retrieve the tag by its slug
  const retrievedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(connection, {
      tagSlug: createdTag.slug,
    });
  typia.assert(retrievedTag);

  // Step 4: Validate all tag properties match between creation and retrieval
  TestValidator.equals("tag ID matches", retrievedTag.id, createdTag.id);
  TestValidator.equals("tag name matches", retrievedTag.name, createdTag.name);
  TestValidator.equals("tag slug matches", retrievedTag.slug, createdTag.slug);
  TestValidator.equals(
    "creation timestamp matches",
    retrievedTag.created_at,
    createdTag.created_at,
  );
  TestValidator.equals(
    "update timestamp matches",
    retrievedTag.updated_at,
    createdTag.updated_at,
  );
}
