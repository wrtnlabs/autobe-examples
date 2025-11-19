import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_comment_retrieval_by_id_not_found(
  connection: api.IConnection,
) {
  // Create a new registered user to authenticate the request
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);

  // Generate a random non-existent comment ID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent comment
  await TestValidator.error(
    "Retrieving non-existent comment should return 404",
    async () =>
      api.functional.discussionBoard.registeredUser.comments.at(connection, {
        commentId: nonExistentCommentId,
      }),
  );
}
