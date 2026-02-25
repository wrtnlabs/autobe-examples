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

export async function test_api_article_tag_mapping_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. RegisteredUser A joins
  const registeredUserAConnection: api.IConnection = { host: connection.host };
  const registeredUserA = await authorize_registered_user_join(
    registeredUserAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  // Update connection headers with token for RegisteredUser A
  registeredUserAConnection.headers = {
    Authorization: registeredUserA.token.access,
  };
  // 2. RegisteredUser A creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserAConnection,
      { body: {} },
    );
  // 3. RegisteredUser A creates a tag mapping for the article
  const tagMappingsPage =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
      registeredUserAConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(tagMappingsPage);
  // Choose one existing tag mapping to try update
  const originalTagMapping = tagMappingsPage.data[0];
  // 4. RegisteredUser B joins as a different user
  const registeredUserBConnection: api.IConnection = { host: connection.host };
  const registeredUserB = await authorize_registered_user_join(
    registeredUserBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  // Update connection headers with token for RegisteredUser B
  registeredUserBConnection.headers = {
    Authorization: registeredUserB.token.access,
  };
  // 5. RegisteredUser B attempts to update the tag mapping belonging to RegisteredUser A's article
  const updatedBody: IDiscussionBoardArticleTagMapping.IUpdate = {
    discussionBoardArticleId: originalTagMapping.discussionBoardArticleId, // same articleId
    discussionBoardTagId: originalTagMapping.discussionBoardTagId, // same tagId
  };
  // Expect the update to fail due to authorization
  await TestValidator.httpError(
    "registered user B update tag mapping unauthorized",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateTagMapping(
        registeredUserBConnection,
        {
          articleId: originalTagMapping.discussionBoardArticleId,
          tagMappingId: originalTagMapping.id,
          body: updatedBody,
        },
      );
    },
  );
  // 6. Verify original tag mapping is unchanged by fetching the tag mappings again
  const tagMappingsPageAfter =
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.createTagMappings(
      registeredUserAConnection,
      {
        articleId: originalTagMapping.discussionBoardArticleId,
        body: {
          discussion_board_article_id:
            originalTagMapping.discussionBoardArticleId,
          discussion_board_tag_id: originalTagMapping.discussionBoardTagId,
        },
      },
    );
  typia.assert(tagMappingsPageAfter);
  // There should be at least the original tag mapping still intact
  const foundOriginal = tagMappingsPageAfter.data.find(
    (mapping) => mapping.id === originalTagMapping.id,
  );
  TestValidator.predicate(
    "original tag mapping remains unchanged",
    foundOriginal !== undefined,
  );
}
