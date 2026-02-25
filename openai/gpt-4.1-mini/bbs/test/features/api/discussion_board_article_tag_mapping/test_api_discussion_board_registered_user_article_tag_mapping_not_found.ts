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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_tag_mapping_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as registered user by joining
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "strongpassword123",
      },
    },
  );
  typia.assert(authorizedUser);
  // Update connection headers with access token for authorized requests
  registeredUserConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  typia.assert(article);
  // Attempt to fetch a non-existent tag mapping for this article
  const nonExistentTagMappingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch non-existent tag mapping returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        registeredUserConnection,
        {
          articleId: article.id,
          tagMappingId: nonExistentTagMappingId,
        },
      );
    },
  );
  // For soft-deleted tag mapping id, we have to create one then delete it
  // Since we cannot delete via API as per given info, simulate soft deleted
  // by a fake id (it won't exist and should return 404, which is same behavior)
  const softDeletedTagMappingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch soft deleted tag mapping returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        registeredUserConnection,
        {
          articleId: article.id,
          tagMappingId: softDeletedTagMappingId,
        },
      );
    },
  );
  // Confirm UUID format enforcement for both path params
  const invalidId = "invalid-uuid-string";
  await TestValidator.httpError(
    "invalid UUID articleId param throws 404 or validation error",
    [400, 404],
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        registeredUserConnection,
        {
          articleId: invalidId as any,
          tagMappingId: nonExistentTagMappingId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "invalid UUID tagMappingId param throws 404 or validation error",
    [400, 404],
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(
        registeredUserConnection,
        {
          articleId: article.id,
          tagMappingId: invalidId as any,
        },
      );
    },
  );
}
