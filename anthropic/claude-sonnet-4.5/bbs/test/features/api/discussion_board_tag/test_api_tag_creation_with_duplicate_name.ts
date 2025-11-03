import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test tag creation validation when attempting to create duplicate tag names.
 *
 * This test validates the uniqueness constraint on tag names in the discussion
 * board system. It ensures that the system properly rejects attempts to create
 * tags with names that already exist, maintaining data integrity and preventing
 * duplicate taxonomy entries.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create the first tag with name 'climate-change'
 * 3. Verify the first tag creation succeeds
 * 4. Attempt to create a second tag with the same name 'climate-change'
 * 5. Verify the duplicate tag creation is rejected with an error
 *
 * This test ensures that the tag uniqueness constraint is properly enforced at
 * the API level, preventing data corruption and maintaining clean taxonomy.
 */
export async function test_api_tag_creation_with_duplicate_name(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create the first tag with name 'climate-change'
  const tagName = "climate-change";
  const firstTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(firstTag);

  // Step 3: Verify first tag creation succeeded
  TestValidator.equals("first tag name matches", firstTag.name, tagName);

  // Step 4: Attempt to create duplicate tag with same name
  await TestValidator.error(
    "duplicate tag name should be rejected",
    async () => {
      await api.functional.discussionBoard.moderator.tags.create(connection, {
        body: {
          name: tagName,
        } satisfies IDiscussionBoardTag.ICreate,
      });
    },
  );
}
