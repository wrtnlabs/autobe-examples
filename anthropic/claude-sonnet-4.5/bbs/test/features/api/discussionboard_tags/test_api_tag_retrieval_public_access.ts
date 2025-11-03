import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tag retrieval is publicly accessible to all user types including
 * guests.
 *
 * This test validates the platform's commitment to open content discovery by
 * verifying that unauthenticated users can access tag information without
 * authentication credentials.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for tag creation privilege
 * 2. Authenticate as moderator to gain tag creation permissions
 * 3. Create a test tag with identifiable properties
 * 4. Create unauthenticated connection (no authorization headers)
 * 5. Retrieve the tag without authentication
 * 6. Validate successful retrieval with complete tag information
 * 7. Verify response includes all public tag properties
 */
export async function test_api_tag_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for tag creation
  const moderatorData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a tag as authenticated moderator
  const tagName = RandomGenerator.alphaNumeric(10);
  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Step 3: Create unauthenticated connection (no authorization headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve tag without authentication using the tag slug
  const retrievedTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.tags.at(unauthConnection, {
      tagSlug: createdTag.slug,
    });
  typia.assert(retrievedTag);

  // Step 5: Validate retrieved tag matches created tag
  TestValidator.equals("tag id matches", retrievedTag.id, createdTag.id);
  TestValidator.equals("tag name matches", retrievedTag.name, createdTag.name);
  TestValidator.equals("tag slug matches", retrievedTag.slug, createdTag.slug);
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
}
