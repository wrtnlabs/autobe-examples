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
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_tag_mapping_removal_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful tag mapping removal by the article's author
  // A registered user signs up and creates an article.
  // The user adds a tag mapping to the article.
  // The user then deletes the tag mapping successfully.
  // Verify that the tag mapping is removed and the response is HTTP 204 No Content.
  // Check that other article data remains intact.
  // 1. User registration and authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_registered_user_join(
    userJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // 2. Create a new tag
  const tagRaw = await generate_random_discussion_board_tags_create(
    userConnection,
    {
      body: {
        name: typia.random<string>(),
      },
    },
  );
  const tag = typia.assert<IDiscussionBoardTag & { id: string }>(tagRaw);
  // 3. Create a new article by the registered user
  const articleRaw =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  const article = typia.assert<IDiscussionBoardArticle & { id: string }>(articleRaw);
  // 4. Create a tag mapping associating the tag to the article
  const tagMappingRaw =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          tagId: tag.id,
        },
      },
    );
  const tagMapping = typia.assert<IDiscussionBoardArticleTagMapping & { id: string }>(tagMappingRaw);
  // 5. Delete the tag mapping
  await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
    userConnection,
    {
      articleId: article.id,
      tagMappingId: tagMapping.id,
    },
  );
  // 6. Confirm tag mapping was removed by trying to delete again and expect failure
  await TestValidator.error("deleting removed tag mapping throws", async () => {
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
      userConnection,
      {
        articleId: article.id,
        tagMappingId: tagMapping.id,
      },
    );
  });
}
