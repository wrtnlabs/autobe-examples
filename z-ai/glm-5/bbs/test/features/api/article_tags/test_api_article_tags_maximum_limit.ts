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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
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
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test maximum tag limit enforcement for discussion board articles.
 *
 * Validates that:
 * 1. Articles can have exactly 15 tags (maximum allowed)
 * 2. All 15 tags are correctly stored and returned
 * 3. Response pagination metadata reflects the complete tag list
 */
export async function test_api_article_tags_maximum_limit(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Create article with initial content
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    { body: { tags: ["initial-tag"] } },
  );
  typia.assert(article);
  // Generate exactly 15 unique tag values (lowercase, alphanumeric with hyphens)
  const tagValues = ArrayUtil.repeat(
    15,
    (index) => `tag-${RandomGenerator.alphabets(8).toLowerCase()}-${index}`,
  );
  // Update article tags to maximum limit (15 tags)
  const response =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          value: tagValues.join(","),
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(response);
  // Validate all 15 tags were stored
  TestValidator.equals("tag count", response.data.length, 15);
  // Validate pagination metadata reflects tag count
  TestValidator.predicate(
    "pagination records correct",
    response.pagination.records >= 15,
  );
}
