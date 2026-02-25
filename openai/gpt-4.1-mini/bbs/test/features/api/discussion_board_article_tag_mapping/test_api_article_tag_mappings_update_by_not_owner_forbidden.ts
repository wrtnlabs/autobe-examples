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

export async function test_api_article_tag_mappings_update_by_not_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first user and get authorized connection
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_registered_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    },
  });
  typia.assert(firstUser);
  // 2. Create article owned by first user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      firstUserConnection,
      {},
    );
  typia.assert(article);
  // 3. Register second user and get authorized connection
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_registered_user_join(
    secondUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      },
    },
  );
  typia.assert(secondUser);
  // 4. Prepare tag mapping update body
  const updateBody: IDiscussionBoardArticleTagMapping.IUpdate = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: typia.random<string & tags.Format<"uuid">>(),
  };
  // 5. Attempt to update tag mappings by second user (not the owner)
  // Expect authorization error 403 Forbidden
  await TestValidator.httpError(
    "forbid tag mapping update by not owner",
    403,
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateTagMappings(
        secondUserConnection,
        {
          articleId: article.id,
          body: updateBody,
        },
      );
    },
  );
}
