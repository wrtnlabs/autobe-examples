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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_tag_removal_unauthorized_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user A (the article author)
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  // 2. Create an article with tags as user A
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {
      body: {
        tags: ["test-tag-one", "test-tag-two"],
      },
    },
  );
  typia.assert(article);
  // 3. Verify article has tags and record IDs
  TestValidator.predicate("article has tags", article.tags.length > 0);
  const articleId = article.id;
  const tagId = article.tags[0].id;
  // 4. Register user B (a different user - non-author)
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // 5. Attempt to remove tag as non-author (user B) should fail with 403
  await TestValidator.httpError(
    "non-author cannot remove tag from another user's article",
    403,
    async () => {
      await api.functional.discussionBoard.user.articles.tags.erase(
        userBConnection,
        {
          articleId,
          tagId,
        },
      );
    },
  );
}
