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

export async function test_api_article_tags_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article with initial tags
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        tags: ["Politics", "ECONOMY", "current-events"],
      },
    },
  );
  typia.assert(article);
  // 3. Update article tags with new set
  const updatedTags =
    await api.functional.discussionBoard.articles.tags.updateTags(
      userConnection,
      {
        articleId: article.id,
        body: {
          value: "policy-debate",
        },
      },
    );
  typia.assert(updatedTags);
  // 4. Validate response structure
  TestValidator.predicate(
    "has pagination",
    updatedTags.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(updatedTags.data));
  // 5. Validate each tag has required properties
  for (const tag of updatedTags.data) {
    TestValidator.predicate("tag has id", tag.id !== undefined);
    TestValidator.predicate("tag has value", tag.value !== undefined);
    TestValidator.predicate(
      "tag value is lowercase",
      tag.value === tag.value.toLowerCase(),
    );
    TestValidator.predicate(
      "tag value format valid",
      /^[a-z0-9_-]+$/.test(tag.value),
    );
  }
  // 6. Validate tag count constraint
  TestValidator.predicate(
    "tag count within limit",
    updatedTags.data.length <= 15,
  );
}
