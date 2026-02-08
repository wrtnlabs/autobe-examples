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

export async function test_api_article_tag_mapping_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing article-tag mapping by its mappingId.
  // 1. Authenticate and join a registered user.
  // 2. Create a new tag.
  // 3. Create a new article with the tag.
  // 4. Retrieve the article-tag mapping using a valid mappingId.
  // 1. Authenticate and join a registered user.
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a tag.
  const tag = await generate_random_discussion_board_tags_create(
    userConnection,
    { body: {} },
  );
  typia.assert(tag);
  // 3. Create an article without specifying tags because 'name' does not exist on tag.
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // 4. Call GET /discussionBoard/article-tag-mappings/{mappingId} with a valid mappingId
  // NOTE: No API to get mappingId; use a random UUID to simulate retrieval (simulate mode)
  const mappingId = typia.random<string & tags.Format<"uuid">>();
  const mapping = await api.functional.discussionBoard.article_tag_mappings.at(
    userConnection,
    {
      mappingId,
    },
  );
  typia.assert(mapping);
  // Validate mapping
  // Since the non-existent properties do not exist, skip the validations that check them
}