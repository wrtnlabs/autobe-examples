import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";

export async function test_api_comment_creation_validation_failure(
  connection: api.IConnection,
) {
  // Create a registered user first
  const registeredUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await api.functional.auth.registered_user.join(connection, {
      body: typia.random<IDiscussionBoardRegisteredUser.ICreate>(),
    });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email",
    registeredUser.email,
    registeredUser.email,
  );

  // Test case 1: Missing required 'content' field
  await TestValidator.error(
    "comment creation should fail with missing content",
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.create(
        connection,
        {
          body: {
            discussion_board_article_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } as IDiscussionBoardComment.ICreate,
        },
      );
    },
  );

  // Test case 2: Empty content
  await TestValidator.error(
    "comment creation should fail with empty content",
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.create(
        connection,
        {
          body: {
            content: "",
            discussion_board_article_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
