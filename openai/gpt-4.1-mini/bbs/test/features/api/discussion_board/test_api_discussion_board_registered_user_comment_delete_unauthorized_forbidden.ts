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

export async function test_api_discussion_board_registered_user_comment_delete_unauthorized_forbidden(
  connection: IConnection,
): Promise<void> {
  // Create and authorize user A
  const userAConnection: IConnection = { host: connection.host };
  const userAAuth = await authorize_registered_user_join(userAConnection, {
    body: {},
  });
  userAConnection.headers = {
    Authorization: `Bearer ${userAAuth.token.access}`,
  };
  // Create and authorize user B
  const userBConnection: IConnection = { host: connection.host };
  const userBAuth = await authorize_registered_user_join(userBConnection, {
    body: {},
  });
  userBConnection.headers = {
    Authorization: `Bearer ${userBAuth.token.access}`,
  };
  // User B tries to delete a comment with a random UUID, expecting 403 Forbidden
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized comment delete forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.erase(
        userBConnection,
        {
          commentId: randomCommentId,
        },
      );
    },
  );
}
