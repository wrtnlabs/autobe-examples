import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_tag_creation_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account to establish authentication context
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!@#";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        href: "https://discussion-board.example.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "https://discussion-board.example.com/" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a new tag with a unique name
  const tagName = RandomGenerator.name(2);
  const createdTag: IDiscussionBoardTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: tagName,
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(createdTag);

  // Step 3: Validate that the tag name is normalized to lowercase (business logic)
  TestValidator.predicate(
    "tag name should be normalized to lowercase",
    createdTag.name === tagName.toLowerCase(),
  );

  // Step 4: Confirm that the slug is URL-friendly (business logic)
  TestValidator.predicate(
    "slug should be URL-friendly (lowercase alphanumeric with hyphens)",
    /^[a-z0-9-]+$/i.test(createdTag.slug),
  );
}
