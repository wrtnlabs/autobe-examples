import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test tag update validation when attempting to rename a tag to a name that
 * already exists.
 *
 * This test validates that the tag update operation correctly enforces tag name
 * uniqueness constraints. It creates two distinct tags and then attempts to
 * rename one to match the other's name, which should be rejected by the
 * system.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Create first tag with name 'international-trade'
 * 3. Create second tag with name 'trade-agreements'
 * 4. Attempt to update second tag's name to 'international-trade' (duplicate)
 * 5. Verify that the update is rejected with appropriate error
 * 6. Confirm tag name uniqueness constraint is enforced
 */
export async function test_api_tag_update_with_duplicate_name(
  connection: api.IConnection,
) {
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  const firstTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "international-trade",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(firstTag);

  const secondTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "trade-agreements",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(secondTag);

  await TestValidator.error(
    "update tag with duplicate name should fail",
    async () => {
      await api.functional.discussionBoard.moderator.tags.update(connection, {
        tagSlug: secondTag.slug,
        body: {
          name: "international-trade",
        } satisfies IDiscussionBoardTag.IUpdate,
      });
    },
  );
}
