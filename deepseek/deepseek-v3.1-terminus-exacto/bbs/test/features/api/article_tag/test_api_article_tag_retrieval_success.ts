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
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // 2. Create an article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 5,
          wordMax: 10,
        }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Add a tag to the article
  const tag = await api.functional.discussionBoard.user.articles.tags.create(
    userConnection,
    {
      articleId: article.id,
      body: {
        tag_name: RandomGenerator.alphabets(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
          >(),
        ),
      } satisfies IDiscussionBoardArticleTag.ICreate,
    },
  );
  typia.assert(tag);
  // 4. Retrieve the specific tag
  const retrievedTag =
    await api.functional.discussionBoard.user.articles.tags.at(userConnection, {
      articleId: article.id,
      tagId: tag.id,
    });
  typia.assert(retrievedTag);
  // 5. Validate the retrieved tag matches the created tag
  TestValidator.equals("tag id matches", retrievedTag.id, tag.id);
  TestValidator.equals("tag name matches", retrievedTag.tag_name, tag.tag_name);
  TestValidator.equals(
    "article id matches",
    retrievedTag.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedTag.created_at !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    retrievedTag.updated_at !== null,
  );
  TestValidator.equals(
    "article summary exists",
    typeof retrievedTag.article,
    "object",
  );
  TestValidator.equals(
    "article summary id matches",
    retrievedTag.article.id,
    article.id,
  );
}
