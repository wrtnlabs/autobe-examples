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
 * Test tag normalization behavior when updating article tags.
 *
 * Due to DTO constraint (IDiscussionBoardArticleTag.IUpdate accepts single string value),
 * this test validates single tag normalization to lowercase.
 * Deduplication testing would require an array-based API which is not available.
 */
export async function test_api_article_tags_normalization_and_deduplication(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // Step 2: Create article prerequisite
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Step 3: Update tag with mixed case value to test normalization
  // Input: "Politics" (uppercase P)
  // Expected: normalized to "politics" (all lowercase)
  const updateResponse =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          value: "Politics",
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Step 4: Verify normalization - tag should be lowercase
  const tagValues = updateResponse.data.map((tag) => tag.value);
  TestValidator.predicate(
    "tag normalized to lowercase",
    tagValues.every((v) => v === v.toLowerCase()),
  );
  TestValidator.predicate(
    "normalized tag 'politics' exists in response",
    tagValues.includes("politics"),
  );
}
