import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_post_update_by_moderator_invalid_values(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderatorInput: IDiscussionBoardModerator.ICreate =
    typia.random<string>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorInput,
    });
  typia.assert(moderator);

  // 2. Create a post as a citizen
  const postInput: IDiscussionBoardPost.ICreate = typia.random<string>();
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: postInput,
    });
  typia.assert(post);

  // 3. Attempt to update the post with invalid values: empty title and empty body
  // This should fail with a 400 error because title and body have minimum length requirements
  await TestValidator.error(
    "update should fail with empty title and empty body",
    async () => {
      await api.functional.discussionBoard.moderator.posts.update(connection, {
        postId: post as string, // Assume returned string from create is the UUID
        body: {
          title: "", // Invalid: empty string, violates minimum 5 characters
          body: "", // Invalid: empty string, violates minimum 10 characters
        } satisfies IDiscussionBoardPost.IUpdate,
      });
    },
  );
}
