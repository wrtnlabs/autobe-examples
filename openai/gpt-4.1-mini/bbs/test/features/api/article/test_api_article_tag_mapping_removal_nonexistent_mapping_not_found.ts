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

export async function test_api_article_tag_mapping_removal_nonexistent_mapping_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(connection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: {} },
    );
  typia.assert(article);
  // 3. Create a new tag
  const tag = await generate_random_discussion_board_tags_create(
    userConnection,
    { body: {} },
  );
  typia.assert(tag);
  // 4. Create a tag mapping associating tag to article
  const tagMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      {
        params: { articleId: (article as any).id },
        body: { tagId: (tag as any).id },
      },
    );
  typia.assert(tagMapping);
  // 5. Prepare a non-existent tagMappingId
  const nonExistentTagMappingId = typia.random<string & tags.Format<"uuid">>();
  // Ensure nonExistentTagMappingId is different from existing tagMapping.id
  if (nonExistentTagMappingId === (tagMapping as any).id) {
    throw new Error(
      "Generated nonExistentTagMappingId equals existing tagMapping.id, retry test",
    );
  }
  // 6. Attempt to delete a non-existent tag mapping and expect HTTP 404 error
  await TestValidator.httpError(
    "non-existent tag mapping deletion returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
        userConnection,
        {
          articleId: (article as any).id,
          tagMappingId: nonExistentTagMappingId,
        },
      );
    },
  );
  // 7. Verify the existing tag mapping still exists by attempting to delete it without error
  await api.functional.discussionBoard.registeredUser.articles.tag_mappings.eraseTagMapping(
    userConnection,
    {
      articleId: (article as any).id,
      tagMappingId: (tagMapping as any).id,
    },
  );
}
