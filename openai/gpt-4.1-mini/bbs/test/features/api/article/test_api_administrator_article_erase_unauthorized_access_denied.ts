import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_administrator_article_erase_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // This test confirms that deleting an article requires authorized administrator access.
  // Create registered user and authenticate
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const userPassword = "user-password-123";
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        password: userPassword,
      },
    },
  );
  typia.assert(registeredUser);
  // Login the registered user
  const loginUserConnection: api.IConnection = { host: connection.host };
  const loggedInUser = await authorize_registered_user_login(
    loginUserConnection,
    {
      body: {
        email: registeredUser.email,
        password: userPassword,
      },
    },
  );
  typia.assert(loggedInUser);
  // Create article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      loginUserConnection,
      {
        body: {
          title: "Unauthorized delete test article",
          content: "Testing unauthorized delete access.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // Attempt to delete the article without administrator authorization; expect HTTP 401 or 403 error
  await TestValidator.httpError(
    "unauthorized delete attempt without admin auth",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.articles.erase(
        connection,
        {
          articleId: article.id,
        },
      );
    },
  );
}
