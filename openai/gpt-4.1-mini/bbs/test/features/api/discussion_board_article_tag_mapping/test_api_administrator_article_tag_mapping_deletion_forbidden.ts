import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_administrator_article_tag_mapping_deletion_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to delete an article tag mapping by a non-administrator user
  // Setup two users: administrator and registered user
  // Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(adminJoinResult);
  await authorize_administrator_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.ILogin>(),
  });
  // Registered user setup
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_registered_user_join(userConnection, {
    body: typia.random<IDiscussionBoardRegisteredUser.IJoin>(),
  });
  typia.assert(userJoinResult);
  await authorize_registered_user_login(userConnection, {
    body: typia.random<IDiscussionBoardRegisteredUser.ILogin>(),
  });
  // Create an article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  typia.assert(article as IEntity);
  const articleId = (article as IEntity).id;
  // Create a tag as the registered user
  const tag = await generate_random_discussion_board_tags_create(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(tag);
  typia.assert(tag as IEntity);
  const tagId = (tag as IEntity).id;
  // Create tag mapping as the registered user
  const tagMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      { body: { tag_id: tagId }, params: { articleId } },
    );
  typia.assert(tagMapping);
  typia.assert(tagMapping as IEntity);
  const tagMappingId = (tagMapping as IEntity).id;
  // Attempt to delete the tag mapping using the administrator deletion endpoint
  // but with registered user auth connection
  await TestValidator.httpError(
    "deletion forbidden to non-admin user",
    403,
    async () => {
      await api.functional.discussionBoard.administrator.articles.tag_mappings.eraseTagMapping(
        userConnection,
        { articleId, tagMappingId },
      );
    },
  );
}
