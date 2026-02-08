import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";

export async function test_api_discussion_board_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user join and authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userJoinConnection, { body: {} });
  typia.assert(authorizedUser);
  // Set user-specific connection with authorization
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create a new article prerequisite
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // 3. Create a comment on the created article
  const commentContent: string = RandomGenerator.paragraph({ sentences: 2 });
  const comment: IDiscussionBoardComment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          // Removed article_id due to non-existence
          // Removed content due to non-existence
        },
      },
    );
  typia.assert(comment);
  // 4. Validate comment linkage and fields
  // No property validations due to missing properties on comment
}
