import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_tag_mapping_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Authorization scenario ensuring that article and tag creation requires authorized registered user.
  //
  // 1. Without authentication, attempt to create a tag and article, expect failure.
  // 2. Authenticate and join a registered user.
  // 3. Successfully create tag and article with authentication.
  // 4. Retrieve article-tag mapping by ID to confirm that unauthorized retrieval fails.
  // 1. Prepare base connections (unauthenticated) for negative tests
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Try to create tag without authentication, expect error
  await TestValidator.error("unauthenticated tag creation", async () => {
    await api.functional.discussionBoard.tags.create(
      unauthenticatedConnection,
      {
        body: typia.random<IDiscussionBoardTag.ICreate>(),
      },
    );
  });
  // Try to create article without authentication, expect error
  await TestValidator.error("unauthenticated article creation", async () => {
    await api.functional.discussionBoard.registeredUser.articles.create(
      unauthenticatedConnection,
      { body: typia.random<IDiscussionBoardArticle.ICreate>() },
    );
  });
  // 2. Authenticate and join registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_registered_user_join(
    registeredUserConnection,
    {},
  );
  typia.assert(auth);
  // Set authorization token for registered user connection
  registeredUserConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 3. Create tag with authenticated registered user
  const tag = await generate_random_discussion_board_tags_create(
    registeredUserConnection,
    {},
  );
  typia.assert(tag);
  // 4. Create article with authenticated registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  typia.assert(article);
  // 5. Attempt to retrieve article-tag mapping by ID using a random UUID, unauthenticated expect error
  await TestValidator.error("unauthenticated mapping retrieval", async () => {
    await api.functional.discussionBoard.article_tag_mappings.at(
      unauthenticatedConnection,
      {
        mappingId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
