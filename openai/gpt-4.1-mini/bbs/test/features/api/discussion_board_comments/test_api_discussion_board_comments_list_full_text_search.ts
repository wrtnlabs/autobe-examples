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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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

export async function test_api_discussion_board_comments_list_full_text_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const userJoinBody: Partial<IDiscussionBoardRegisteredUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongpassword123",
  };
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    { body: userJoinBody },
  );
  typia.assert(registeredUser);
  // Create a new connection for authenticated user with auth header
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: registeredUser.token.access };
  // 2. Create an article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      authConnection,
      {},
    );
  typia.assert(article);
  // 3. Perform full-text search on comments with contentKeywords using a substring of article content
  const searchKeyword = article.content.substring(0, 10);
  const searchBody: IDiscussionBoardComment.IRequest = {
    discussionBoardArticleId: article.id,
    contentKeywords: searchKeyword,
    page: 1,
    limit: 5,
  };
  const response =
    await api.functional.discussionBoard.registeredUser.comments.index(
      authConnection,
      { body: searchBody },
    );
  typia.assert(response);
  // 4. Validate pagination info
  TestValidator.predicate(
    `pagination current should be 1 for keyword ${searchKeyword}`,
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    `pagination limit should be 5 for keyword ${searchKeyword}`,
    response.pagination.limit === 5,
  );
  TestValidator.predicate(
    `pagination records should be >= data length for keyword ${searchKeyword}`,
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    `pagination pages should be correct (>= 1) for keyword ${searchKeyword}`,
    response.pagination.pages >= 1,
  );
  // 5. Validate sorted order oldest first
  for (let i = 1; i < response.data.length; i++) {
    const prev = response.data[i - 1];
    const cur = response.data[i];
    TestValidator.predicate(
      `comments sorted oldest first for keyword ${searchKeyword}`,
      new Date(prev.createdAt).getTime() <= new Date(cur.createdAt).getTime(),
    );
  }
  // 6. Validate author info
  for (const comment of response.data) {
    typia.assert(comment.author);
    TestValidator.predicate(
      `comment author id is uuid for keyword ${searchKeyword}`,
      typeof comment.author.id === "string" && comment.author.id.length > 0,
    );
    TestValidator.predicate(
      `comment author displayName exists for keyword ${searchKeyword}`,
      typeof comment.author.displayName === "string" &&
        comment.author.displayName.length > 0,
    );
  }
  // 7. Confirm authorization is required by calling API with unauthorized connection
  await TestValidator.error(
    "should fail comment search without authorization",
    async () => {
      await api.functional.discussionBoard.registeredUser.comments.index(
        connection,
        {
          body: {
            discussionBoardArticleId: article.id,
            contentKeywords: searchKeyword,
            page: 1,
            limit: 5,
          },
        },
      );
    },
  );
}
