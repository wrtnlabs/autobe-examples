import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_article_deletion_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful article deletion by the article author
  // Step 1: Register a new user and authorize
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    userJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "test-password",
      },
    },
  );
  typia.assert(authorizedUser);
  // Create a new connection for authorized user with token
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedUser.token.access },
  };
  // Step 2: Create an article by the authorized user
  const createdArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(createdArticle);
  // Step 3: Delete the article by the author
  await api.functional.discussionBoard.registeredUser.articles.erase(
    userConnection,
    {
      articleId: createdArticle.id,
    },
  );
  // Step 4: Verify that the article is no longer retrievable
  // Attempt to get the deleted article should result in error
  // However, since no GET endpoint provided, we verify deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "deleting already deleted article throws error",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.erase(
        userConnection,
        {
          articleId: createdArticle.id,
        },
      );
    },
  );
}
