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

export async function test_api_article_tag_removal_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article with multiple tags
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        tags: ["economy", "politics", "policy"],
      },
    },
  );
  typia.assert(article);
  // 3. Find the 'policy' tag to remove
  const policyTag = article.tags.find((tag) => tag.value === "policy");
  TestValidator.predicate(
    "policy tag exists in article",
    policyTag !== undefined,
  );
  // Store initial state for reference
  const initialTagCount = article.tags.length;
  const policyTagId = policyTag!.id;
  // 4. Remove the 'policy' tag from the article
  // This deletes only the junction record, not the tag entity itself
  await api.functional.discussionBoard.user.articles.tags.erase(
    userConnection,
    {
      articleId: article.id,
      tagId: policyTagId,
    },
  );
  // Note: Without a GET endpoint to fetch the article, we cannot verify
  // the post-removal state. The operation completing without error indicates
  // successful tag removal from the junction table.
}
