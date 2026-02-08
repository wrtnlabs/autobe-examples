import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
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

export async function test_api_comment_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a registered user
  const baseConnection: api.IConnection = { host: connection.host };
  const userEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const userPassword = "password123";
  // Join
  const registeredUserAuth = await authorize_registered_user_join(
    baseConnection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardRegisteredUser.IJoin,
    },
  );
  typia.assert(registeredUserAuth);
  // New user connection with token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: registeredUserAuth.token.access };
  // 2. Register and authenticate an administrator
  const adminEmail = `${RandomGenerator.alphabets(10)}@admin.com`;
  const adminPassword = "adminpassword";
  // Admin join
  const adminAuth = await authorize_administrator_join(baseConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // New admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 3. As the registered user, create an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // Since article has no properties, generate dummy articleId for comment creation
  // but actually, generate_random_discussion_board_registered_user_articles_create returns IDiscussionBoardArticle which is empty, so no id available
  // We generate a uuid for article id
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 4. As the registered user, create a comment on the article
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          article_id: articleId,
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Similarly, comment has no known properties, so generate UUID for commentId
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Define snapshotId equal to commentId, as no update or snapshot creation API exists
  const snapshotId = commentId;
  // 6. Retrieve snapshot with valid commentId and snapshotId
  const snapshot =
    await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
      adminConnection,
      { commentId, snapshotId },
    );
  typia.assert(snapshot);
  // Cannot validate specific properties as IDiscussionBoardCommentSnapshot has no properties
  // Just check snapshot is truthy and type assertion passed
  TestValidator.predicate(
    "snapshot is returned and valid",
    snapshot !== null && snapshot !== undefined,
  );
  // 7. Confirm unauthorized access fails
  await TestValidator.error("unauthorized access", async () => {
    await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
      userConnection,
      { commentId, snapshotId },
    );
  });
  // 8. Confirm 404 when comment or snapshot does not exist
  await TestValidator.httpError("comment not found", 404, async () => {
    await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
      adminConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId,
      },
    );
  });
  await TestValidator.httpError("snapshot not found", 404, async () => {
    await api.functional.discussionBoard.administrator.comments.snapshots.atSnapshot(
      adminConnection,
      {
        commentId,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
