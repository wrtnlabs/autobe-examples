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

export async function test_api_discussion_board_comment_creation_content_max_length(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new user and authorize
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    userJoinConnection,
    { body: {} },
  );
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create a new article by the authorized user
  const articleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  // Cast articleRaw to IDiscussionBoardArticle & { id: number | string } to access id safely
  const article = typia.assert(articleRaw) as IDiscussionBoardArticle & { id: string }; 
  // 3. Prepare comment content at maximum allowed length (assumed 1000 chars)
  const maxContentLength = 1000;
  const content = "a".repeat(maxContentLength);
  // 4. Create comment linked to the article
  const commentRaw =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          content,
          article_id: article.id,
        },
      },
    );
  // Cast commentRaw to IDiscussionBoardComment & { content: string; article_id: string; created_at: string; updated_at: string } to access safely
  const comment = typia.assert(commentRaw) as IDiscussionBoardComment & {
    content: string;
    article_id: string;
    created_at: string;
    updated_at: string;
  };
  // 5. Validate comment content length and linkage
  TestValidator.equals(
    "comment content length",
    comment.content.length,
    maxContentLength,
  );
  TestValidator.equals("article ID matches", comment.article_id, article.id);
  // 6. Validate timestamps presence and ISO format
  TestValidator.predicate(
    "created_at presence and valid ISO",
    !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.predicate(
    "updated_at presence and valid ISO",
    !isNaN(Date.parse(comment.updated_at)),
  );
}
