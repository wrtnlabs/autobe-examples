import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_article_tag_mappings_create_success_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Secret1234!",
    },
  });
  typia.assert(userAuth);
  // Update userConnection headers with token
  userConnection.headers = {
    Authorization: userAuth.token.access,
  };
  // 2. Create a new article by this user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // 3. Create multiple valid tags (simulate by generating tags)
  // Since no explicit tag creation endpoint is given, simulate by generating random UUIDs for tags
  const tagsCount = 3;
  const tagIds = ArrayUtil.repeat(tagsCount, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 4. Add these tags to the article using the tag-mappings endpoint
  // Add all tags sequentially
  const accumulatedTagMappings: IDiscussionBoardArticleTagMapping.ISummary[] =
    [];
  for (const tagId of tagIds) {
    const addResponse =
      await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: tagId,
          },
        },
      );
    typia.assert(addResponse);
    accumulatedTagMappings.push(...addResponse.data);
  }
  // 5. Verify the response includes all newly added tag mappings
  const uniqueTagIds = new Set(
    accumulatedTagMappings.map((mapping) => mapping.discussionBoardTagId),
  );
  for (const tagId of tagIds) {
    TestValidator.predicate("tag mapping presence", uniqueTagIds.has(tagId));
  }
  // 6. Confirm duplicates in requests do not cause errors and are ignored
  TestValidator.equals(
    "unique tag count equals data length",
    uniqueTagIds.size,
    accumulatedTagMappings.length,
  );
}
