import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
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
import { generate_random_discussion_board_user_sections_create } from "../../../generate/generate_random_discussion_board_user_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that requesting a soft-deleted article returns 404 Not Found error.
 *
 * This validates the soft-delete mechanism where:
 * 1. Articles are marked with deleted_at timestamp instead of being permanently removed
 * 2. Public GET endpoint filters out soft-deleted articles (deleted_at IS NULL)
 * 3. Soft-deleted articles remain in database for audit purposes
 *
 * Flow: User joins → Creates section → Creates article → Soft-deletes article → GET returns 404
 */
export async function test_api_article_detail_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User authentication - create a new user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Step 2: Create a section for the article
  const section = await generate_random_discussion_board_user_sections_create(
    userConnection,
    {},
  );
  typia.assert(section);
  // Step 3: Create an article that will be soft-deleted
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // Step 4: Verify article is accessible before deletion
  const articleBeforeDeletion =
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: article.id,
    });
  typia.assert(articleBeforeDeletion);
  TestValidator.equals(
    "article accessible before deletion",
    articleBeforeDeletion.id,
    article.id,
  );
  // Step 5: Soft-delete the article
  await api.functional.discussionBoard.user.articles.erase(userConnection, {
    articleId: article.id,
  });
  // Step 6: Verify soft-deleted article returns 404 Not Found
  await TestValidator.httpError(
    "soft-deleted article returns 404",
    404,
    async () =>
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: article.id,
      }),
  );
}
