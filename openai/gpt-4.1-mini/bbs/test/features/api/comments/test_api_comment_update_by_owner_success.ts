import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and obtain an actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Create a new comment on the article as the same registered user
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      { body: { article_id: (article as any).id } },
    );
  typia.assert(comment);
  // 4. Prepare updated comment content
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  // 5. Update the comment content by the owner user
  const updatedComment =
    await api.functional.discussionBoard.registeredUser.comments.update(
      userConnection,
      {
        commentId: (comment as any).id,
        body: {
          content: newContent,
        },
      },
    );
  typia.assert(updatedComment);
  // 6. Validate that the comment content is updated
  TestValidator.equals(
    "updated comment content",
    (updatedComment as any).content,
    newContent,
  );
}
