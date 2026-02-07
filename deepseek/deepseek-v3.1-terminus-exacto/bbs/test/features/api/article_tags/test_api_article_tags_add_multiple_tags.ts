import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tags_add_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article to apply tags to
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add multiple tags to the article
  const tagsToAdd = ["economics", "politics", "analysis"];
  const updatedTag =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          add: tagsToAdd,
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(updatedTag);
  // Validate that the tag was added successfully
  TestValidator.equals(
    "tag name matches first tag",
    updatedTag.tag_name,
    "economics",
  );
  TestValidator.equals("article ID matches", updatedTag.article.id, article.id);
  // Test duplicate tag prevention by trying to add the same tags again
  const duplicateTagResponse =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          add: ["economics"], // Try to add duplicate tag
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(duplicateTagResponse);
  // The response should still contain the original tag
  TestValidator.equals(
    "tag name remains after duplicate attempt",
    duplicateTagResponse.tag_name,
    "economics",
  );
}