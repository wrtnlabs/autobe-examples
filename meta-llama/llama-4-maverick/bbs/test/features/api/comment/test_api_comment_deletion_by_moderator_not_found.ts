import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_comment_deletion_by_moderator_not_found(
  connection: api.IConnection,
) {
  // Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "1234",
        username: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Generate a random non-existent comment ID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to delete the non-existent comment
  await TestValidator.httpError(
    "deleting non-existent comment should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.moderator.comments.erase(
        connection,
        {
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
