import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_discussion_board_registered_user_article_tag_mapping_deletion_nonexistent_tag_mapping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new registered user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
      },
    },
  );
  typia.assert(userAuthorized);
  // Set authorization header after join
  registeredUserConnection.headers ??= {};
  registeredUserConnection.headers.Authorization = userAuthorized.token.access;
  // 2. Create new article for the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      {},
    );
  typia.assert(article);
  // 3. Attempt to delete a non-existent tag mapping for the article
  // Generate fake UUID for a non-existent tag mapping
  const fakeTagMappingId = typia.random<string & tags.Format<"uuid">>();
  // Call erase endpoint and expect HttpError 404
  await TestValidator.httpError(
    "delete non-existent tag mapping should return 404",
    404,
    async () =>
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.erase(
        registeredUserConnection,
        {
          articleId: article.id,
          tagMappingId: fakeTagMappingId,
        },
      ),
  );
}
