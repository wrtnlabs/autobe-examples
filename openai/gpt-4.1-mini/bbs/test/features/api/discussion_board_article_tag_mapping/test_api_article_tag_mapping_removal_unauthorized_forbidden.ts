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

export async function test_api_article_tag_mapping_removal_unauthorized_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Original author user signs up
  const originalUserConnection: api.IConnection = { host: connection.host };
  const originalUserAuth = await authorize_registered_user_join(
    originalUserConnection,
    { body: {} },
  );
  originalUserConnection.headers = {
    Authorization: originalUserAuth.token.access,
  };
  // 2. Original user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      originalUserConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Original user creates a tag
  const tag = await generate_random_discussion_board_tags_create(
    originalUserConnection,
    { body: {} },
  );
  typia.assert(tag);
  // 4. Original user creates a tag mapping between article and tag
  const tagMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      originalUserConnection,
      {
        params: { articleId: (article as any).id },
        body: { tagId: (tag as any).id },
      },
    );
  typia.assert(tagMapping);
  // 5. A different registered user signs up
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUserAuth = await authorize_registered_user_join(
    otherUserConnection,
    { body: {} },
  );
  otherUserConnection.headers = { Authorization: otherUserAuth.token.access };
  // 6. The different user attempts to delete the tag mapping on the first user's article
  await TestValidator.httpError(
    "delete tag mapping by unauthorized user should be forbidden",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
        otherUserConnection,
        {
          articleId: (article as any).id,
          tagMappingId: (tagMapping as any).id,
        },
      );
    },
  );
  // 7. Verify that the tag mapping still exists by trying to delete with original user (should succeed)
  await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
    originalUserConnection,
    {
      articleId: (article as any).id,
      tagMappingId: (tagMapping as any).id,
    },
  );
}
