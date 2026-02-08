import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_discussion_board_registered_user_article_tag_mappings_clear_all_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create an article by the registered user with non-empty tags
  const tags: (string & tags.Format<"uuid">)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId: null,
          tags: tags,
        },
      },
    );
  typia.assert(article);
  // 3. Clear all tags by sending empty tag list in PATCH
  const response =
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateTagMappings(
      userConnection,
      {
        articleId: (
          article as {
            id: string & tags.Format<"uuid">;
          }
        ).id,
        body: {
          tagIds: [],
        },
      },
    );
  typia.assert(response);
  // 4. Validate that no tag mappings remain
  TestValidator.equals(
    "tag mappings count after clear",
    response.data.length,
    0,
  );
}
