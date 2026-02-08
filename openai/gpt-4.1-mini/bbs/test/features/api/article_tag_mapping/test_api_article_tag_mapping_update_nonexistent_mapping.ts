import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";

export async function test_api_article_tag_mapping_update_nonexistent_mapping(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and obtains token
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {}, // IJoin has no required properties
  });
  // Inject token into userConnection headers
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create an article for the user
  const article =
    (await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {}, // Use default random article creation
      },
    )) as IDiscussionBoardArticle & { id: string & tags.Format<"uuid"> };
  typia.assert(article);
  // 3. Create a tag for the user
  const tag =
    (await generate_random_discussion_board_tags_create(userConnection, {
      body: {}, // Use default random tag creation
    })) as IDiscussionBoardTag & { id: string & tags.Format<"uuid"> };
  typia.assert(tag);
  // 4. Compose update body with existing article and tag IDs
  const updateBody: IDiscussionBoardArticleTagMapping.IUpdate = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId: tag.id,
  };
  // 5. Attempt to update a non-existent mapping ID
  const nonExistentMappingId = typia.random<string & tags.Format<"uuid">>();
  // 6. Test update operation expecting HTTP 404 error
  await TestValidator.httpError(
    "updating non-existent article-tag mapping returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.article_tag_mappings.updateArticleTagMapping(
        userConnection,
        {
          mappingId: nonExistentMappingId,
          body: updateBody,
        },
      );
    },
  );
}
