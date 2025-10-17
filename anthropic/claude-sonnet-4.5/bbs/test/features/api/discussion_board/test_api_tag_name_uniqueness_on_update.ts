import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that tag name uniqueness constraints are enforced during update
 * operations.
 *
 * This test validates that moderators cannot rename a tag to match an existing
 * tag name, that the uniqueness check is case-insensitive due to lowercase
 * normalization, and that appropriate error messages are returned when
 * attempting to create duplicate tags through renaming. The test creates two
 * distinct tags, then attempts to rename the second tag to match the first
 * tag's name (in various cases), verifying that all attempts are rejected with
 * proper validation errors. This ensures the tag vocabulary maintains
 * uniqueness even through update operations.
 *
 * Steps:
 *
 * 1. Authenticate as a moderator with tag update permissions
 * 2. Create first tag with a unique name
 * 3. Create second tag with a different unique name
 * 4. Attempt to rename second tag to match first tag's name (exact case)
 * 5. Attempt to rename second tag with different casing variations
 * 6. Verify all rename attempts are rejected with validation errors
 */
export async function test_api_tag_name_uniqueness_on_update(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator with tag update permissions
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderatorBody = {
    appointed_by_admin_id: adminId,
    username: RandomGenerator.alphaNumeric(10),
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Create first tag with a unique name
  const firstTagName = RandomGenerator.name(2);
  const firstTagBody = {
    name: firstTagName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardTag.ICreate;

  const firstTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: firstTagBody,
    });
  typia.assert(firstTag);

  // Step 3: Create second tag with a different unique name
  const secondTagName = RandomGenerator.name(2);
  const secondTagBody = {
    name: secondTagName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardTag.ICreate;

  const secondTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: secondTagBody,
    });
  typia.assert(secondTag);

  // Step 4: Attempt to rename second tag to match first tag's name (exact case)
  await TestValidator.error(
    "cannot rename tag to duplicate name with exact case",
    async () => {
      await api.functional.discussionBoard.moderator.tags.update(connection, {
        tagId: secondTag.id,
        body: {
          name: firstTag.name,
        } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );

  // Step 5: Attempt to rename second tag with uppercase variation
  await TestValidator.error(
    "cannot rename tag to duplicate name with uppercase variation",
    async () => {
      await api.functional.discussionBoard.moderator.tags.update(connection, {
        tagId: secondTag.id,
        body: {
          name: firstTag.name.toUpperCase(),
        } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );

  // Step 6: Attempt to rename second tag with mixed case variation
  await TestValidator.error(
    "cannot rename tag to duplicate name with mixed case variation",
    async () => {
      const mixedCaseName = firstTag.name
        .split("")
        .map((char, index) =>
          index % 2 === 0 ? char.toUpperCase() : char.toLowerCase(),
        )
        .join("");

      await api.functional.discussionBoard.moderator.tags.update(connection, {
        tagId: secondTag.id,
        body: {
          name: mixedCaseName,
        } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );
}
