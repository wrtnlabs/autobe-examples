import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

export async function test_api_discussion_board_registered_user_article_retrieval_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that an unauthenticated guest user can access the detailed view
  // of a registered user's article by articleId.
  // 1. Create a registered user by joining with the auth endpoint utility function.
  // 2. Using the registered user connection, create an article in the registeredUser scope.
  // 3. Then, with the base connection (guest, no authorization headers), call the article retrieval endpoint with articleId.
  // 4. Verify that the returned article data is correct and complete after typia.assert.
  // 1. Registered user join
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUserAuthorized = await authorize_registered_user_join(
    registeredUserConnection,
    { body: {} },
  );
  registeredUserConnection.headers = {
    Authorization: `Bearer ${registeredUserAuthorized.token.access}`,
  };
  // 2. Creating an article by the registered user
  // However, there is no direct utility or SDK to create articles provided in the context.
  // The scenario and data usage specify no authentication requirement for reading an article,
  // but we need a valid articleId. Since no creation function is given, we cannot create an article.
  // Therefore, to comply with the instruction to rewrite the test if impossible,
  // we'll call the article retrieval endpoint with a random UUID as articleId.
  // Use a random UUID for a possible valid articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Guest access to retrieve article
  const article =
    await api.functional.discussionBoard.registeredUser.articles.at(
      connection,
      { articleId },
    );
  // 4. Validate response type
  typia.assert(article);
}