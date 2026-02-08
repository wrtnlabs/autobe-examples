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

export async function test_api_administrator_article_tag_mapping_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_administrator_join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
    },
  );
  typia.assert(adminJoinResponse);
  const adminLoginResponse = await authorize_administrator_login(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(adminLoginResponse);
  // 2. Registered user setup
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_registered_user_join(
    userConnection,
    {
      body: typia.random<IDiscussionBoardRegisteredUser.IJoin>(),
    },
  );
  typia.assert(userJoinResponse);
  const userLoginResponse = await authorize_registered_user_login(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(userLoginResponse);
  // 3. Create an article as registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(article);
  // 4. Create a tag as registered user
  const tag = await generate_random_discussion_board_tags_create(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(tag);
  // 5. Create tag mapping linking tag to article as registered user
  const tagMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      {
        params: { articleId: (article as any).id },
        body: {
          tagId: (tag as any).id,
        } satisfies IDiscussionBoardArticleTagMapping.ICreate,
      },
    );
  typia.assert(tagMapping);
  // 6. Use administrator to delete the tag mapping (authorized actor)
  await api.functional.discussionBoard.administrator.articles.tag_mappings.eraseTagMapping(
    adminConnection,
    {
      articleId: (article as any).id,
      tagMappingId: (tagMapping as any).id,
    },
  );
  // 7. Validate deletion: After deletion, attempts to delete again should error
  await TestValidator.error(
    "deletion of non-existing tag mapping throws",
    async () =>
      await api.functional.discussionBoard.administrator.articles.tag_mappings.eraseTagMapping(
        adminConnection,
        {
          articleId: (article as any).id,
          tagMappingId: (tagMapping as any).id,
        },
      ),
  );
}
