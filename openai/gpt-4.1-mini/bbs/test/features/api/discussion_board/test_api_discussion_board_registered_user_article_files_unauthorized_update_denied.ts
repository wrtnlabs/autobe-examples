import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_files_unauthorized_update_denied(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as registered user 'A'
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_registered_user_join(userAConnection, {
    body: {},
  });
  typia.assert(userA);
  userAConnection.headers = { Authorization: `Bearer ${userA.token.access}` };
  // Authenticate as registered user 'B'
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_registered_user_join(userBConnection, {
    body: {},
  });
  typia.assert(userB);
  userBConnection.headers = { Authorization: `Bearer ${userB.token.access}` };
  // Create an article by user 'B'
  const articleB =
    await generate_random_discussion_board_registered_user_articles_create(
      userBConnection,
      { body: {} },
    );
  typia.assert(articleB);
  // User 'A' attempts to update the files attached to user 'B''s article
  const invalidBody: IDiscussionBoardArticleFile.IRequest = {};
  await TestValidator.httpError(
    "Unauthorized user cannot update files of another user's article",
    401,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.index(
        userAConnection,
        {
          articleId: (articleB as any).id satisfies string as string,
          body: invalidBody,
        },
      );
    },
  );
}
