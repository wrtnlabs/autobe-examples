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

export async function test_api_article_tag_maximum_limit(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user account and connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // Step 2: Create article for testing
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Add tags 1-10 (maximum allowed)
  const createdTags: IDiscussionBoardArticleTag[] = [];
  for (let i = 0; i < 10; i++) {
    const tag =
      await generate_random_discussion_board_user_articles_tags_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            tag_name: RandomGenerator.alphaNumeric(8),
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
    TestValidator.equals(
      `tag ${i + 1} article ID matches`,
      tag.discussion_board_article_id,
      article.id,
    );
  }
  // Step 4: Verify we have exactly 10 tags
  TestValidator.equals(
    "maximum tags before limit reached",
    createdTags.length,
    10,
  );
  // Step 5: Attempt to add 11th tag (should fail)
  await TestValidator.error(
    "11th tag should exceed maximum limit",
    async () => {
      await api.functional.discussionBoard.user.articles.tags.create(
        userConnection,
        {
          articleId: article.id,
          body: {
            tag_name: RandomGenerator.alphaNumeric(8),
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    },
  );
}
