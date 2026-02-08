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
import { generate_random_discussion_board_article_tag_mappings_create } from "../../../generate/generate_random_discussion_board_article_tag_mappings_create";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_tag_mapping_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Prepare base connection
  const baseConnection: api.IConnection = { host: connection.host };
  // Join as a registered user
  const joined = await authorize_registered_user_join(baseConnection, {
    body: {},
  });
  typia.assert(joined);
  // Prepare user connection with authorization header
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: joined.token.access };
  // Generate random UUIDs for mappingId and body properties
  const mappingId = typia.random<string & tags.Format<"uuid">>();
  const discussionBoardArticleId = typia.random<string & tags.Format<"uuid">>();
  const discussionBoardTagId = typia.random<string & tags.Format<"uuid">>();
  // Call updateArticleTagMapping with these random UUIDs
  const updatedMapping =
    await api.functional.discussionBoard.article_tag_mappings.updateArticleTagMapping(
      userConnection,
      {
        mappingId,
        body: {
          discussionBoardArticleId,
          discussionBoardTagId,
        },
      },
    );
  typia.assert(updatedMapping);
  // Cannot test equality on properties that do not exist in DTO
  // Just assert that updatedMapping is defined and passes typia
}
