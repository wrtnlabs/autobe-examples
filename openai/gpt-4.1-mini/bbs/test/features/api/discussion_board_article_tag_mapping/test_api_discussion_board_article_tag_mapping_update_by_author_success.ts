import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_discussion_board_article_tag_mapping_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for the successful update of an article tag mapping by the article's author.
  // Due to the lack of API to create an article and its tag mapping, this test will
  // simulate the input IDs and verify that the update call succeeds with valid authorization
  // 1. Register a new user as author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorJoin = await authorize_registered_user_join(authorConnection, {
    body: {},
  });
  typia.assert(authorJoin);
  authorConnection.headers = {
    Authorization: `Bearer ${authorJoin.token.access}`,
  };
  // 2. Create two valid tags (initial and new) to simulate tag update context
  const initialTag = await generate_random_discussion_board_tags_create(
    authorConnection,
    { body: {} },
  );
  typia.assert(initialTag);
  const newTag = await generate_random_discussion_board_tags_create(
    authorConnection,
    { body: {} },
  );
  typia.assert(newTag);
  // 3. Simulate existing article ID and tag mapping ID with UUID format
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const tagMappingId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call update API with empty body (since update DTO has no properties)
  const updatedMapping =
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateArticleTagMapping(
      authorConnection,
      {
        articleId: articleId,
        tagMappingId: tagMappingId,
        body: {},
      },
    );
  typia.assert(updatedMapping);
  // No further property validations possible due to empty DTO definitions
}
