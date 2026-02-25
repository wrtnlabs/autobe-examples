import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test the business rule enforcement that an article cannot have more than 15 tags.
 *
 * Test Steps:
 * 1. Register a new user via join endpoint to get authenticated connection
 * 2. Create an article
 * 3. Add tags to the article one by one until reaching exactly 15 tags
 * 4. Verify that adding the 16th tag results in an error
 */
export async function test_api_article_tags_limit_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and get authenticated connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create an article without tags
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    { body: { tags: [] } },
  );
  typia.assert(article);
  // 3. Add 15 tags to the article one by one
  let currentArticle = article;
  for (let i = 0; i < 15; i++) {
    const tagValue = RandomGenerator.alphaNumeric(8);
    currentArticle =
      await generate_random_discussion_board_user_articles_tags_create(
        userConnection,
        {
          params: { articleId: currentArticle.id },
          body: { value: tagValue },
        },
      );
    typia.assert(currentArticle);
  }
  // Verify article has exactly 15 tags
  TestValidator.equals("article has 15 tags", currentArticle.tags.length, 15);
  // 4. Attempt to add a 16th tag - should fail
  const sixteenthTag = RandomGenerator.alphaNumeric(8);
  await TestValidator.error("16th tag should fail", async () => {
    await api.functional.discussionBoard.user.articles.tags.create(
      userConnection,
      {
        articleId: currentArticle.id,
        body: {
          value: sixteenthTag,
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  });
}
