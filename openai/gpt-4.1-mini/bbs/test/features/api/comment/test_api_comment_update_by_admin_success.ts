import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an administrator can successfully update a comment originally created by a registered user.
  // Steps:
  // 1. Join and login as a registered user.
  // 2. Join and login as an administrator.
  // 3. Create a new article as the registered user.
  // 4. Create a new comment on the article as the registered user.
  // 5. Update the comment content as the administrator.
  // 6. Verify the update was successful.
  // 1. Register and authenticate a registered user
  const registeredUserJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const registeredUserAuth = await authorize_registered_user_join(
    registeredUserJoinConnection,
    { body: {} },
  );
  typia.assert(registeredUserAuth);
  const registeredUserConnection: api.IConnection = { host: connection.host };
  registeredUserConnection.headers = {
    Authorization: `Bearer ${registeredUserAuth.token.access}`,
  };
  // 2. Register and authenticate an administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  const castedArticle = typia.assert<IDiscussionBoardArticle & { id: string }>(article);
  // 4. Create a comment as the registered user on the article
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      registeredUserConnection,
      { body: { article_id: castedArticle.id } },
    );
  const castedComment = typia.assert<IDiscussionBoardComment & { id: string; content: string }>(comment);
  // 5. Update the comment content as the administrator
  const updateBody: IDiscussionBoardComment.IUpdate = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedComment =
    await api.functional.discussionBoard.registeredUser.comments.update(
      adminConnection,
      {
        commentId: castedComment.id,
        body: updateBody,
      },
    );
  const castedUpdatedComment = typia.assert<IDiscussionBoardComment & { content: string }>(updatedComment);
  // 6. Verify that the comment content was changed
  TestValidator.notEquals(
    "comment content should differ after update",
    castedComment.content,
    castedUpdatedComment.content,
  );
}
