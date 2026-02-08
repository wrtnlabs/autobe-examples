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

export async function test_api_article_tag_mapping_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(joined);
  userConnection.headers = { Authorization: joined.token.access };
  // 2. Create a new article as the registered user
  const rawArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(rawArticle);
  // Force type assertion to assure the existence of 'id' property
  const article = rawArticle as IDiscussionBoardArticle & { id: string };
  // 3. Create a new tag
  const rawTag = await generate_random_discussion_board_tags_create(
    userConnection,
    {},
  );
  typia.assert(rawTag);
  // Force type assertion for 'id' property
  const tag = rawTag as IDiscussionBoardTag & { id: string };
  // 4. Create the first tag mapping (should succeed)
  const firstMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      {
        params: { articleId: article.id },
        body: { tagId: tag.id },
      },
    );
  typia.assert(firstMapping);
  // 5. Attempt to create the same tag mapping again (should fail)
  await TestValidator.error(
    "duplicate tag mapping should be rejected",
    async () => {
      await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
        userConnection,
        {
          params: { articleId: article.id },
          body: { tagId: tag.id },
        },
      );
    },
  );
}
