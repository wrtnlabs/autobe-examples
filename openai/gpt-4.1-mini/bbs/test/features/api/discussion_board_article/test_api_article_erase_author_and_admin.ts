import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_erase_author_and_admin(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Article author deletes their own article successfully.
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = userConnection.headers ?? {};
  userConnection.headers.Authorization = userAuth.token.access;
  const articleByUserRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(articleByUserRaw);
  const articleByUser = articleByUserRaw as IEntity; // Cast non-generic IEntity to access 'id'
  await api.functional.discussionBoard.registeredUser.articles.erase(
    userConnection,
    {
      articleId: articleByUser.id,
    },
  );
  // Confirm article is deleted by attempting to delete again and expecting 404
  await TestValidator.error(
    "Scenario 1: Deleting the same article again throws 404",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.erase(
        userConnection,
        {
          articleId: articleByUser.id,
        },
      );
    },
  );
  // Scenario 2: Administrator deletes any user's article successfully.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUserAuth = await authorize_registered_user_join(
    anotherUserConnection,
    {
      body: {},
    },
  );
  anotherUserConnection.headers = anotherUserConnection.headers ?? {};
  anotherUserConnection.headers.Authorization = anotherUserAuth.token.access;
  const articleByAnotherUserRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      anotherUserConnection,
      {
        body: {},
      },
    );
  typia.assert(articleByAnotherUserRaw);
  const articleByAnotherUser = articleByAnotherUserRaw as IEntity; // Cast non-generic IEntity
  await api.functional.discussionBoard.registeredUser.articles.erase(
    adminConnection,
    {
      articleId: articleByAnotherUser.id,
    },
  );
  // Confirm article is deleted by attempting to delete again and expecting 404
  await TestValidator.error(
    "Scenario 2: Admin deleting already deleted article throws 404",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.erase(
        adminConnection,
        {
          articleId: articleByAnotherUser.id,
        },
      );
    },
  );
  // Scenario 3: Attempt to delete an article that does not exist.
  const userConnection3: api.IConnection = { host: connection.host };
  const userAuth3 = await authorize_registered_user_join(userConnection3, {
    body: {},
  });
  userConnection3.headers = userConnection3.headers ?? {};
  userConnection3.headers.Authorization = userAuth3.token.access;
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Scenario 3: Deleting non-existent article throws 404",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.erase(
        userConnection3,
        {
          articleId: nonExistentArticleId,
        },
      );
    },
  );
}
