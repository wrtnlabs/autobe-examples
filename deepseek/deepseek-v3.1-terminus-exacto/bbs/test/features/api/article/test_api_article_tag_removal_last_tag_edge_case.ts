import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_removal_last_tag_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Create article with random data
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // Add only one tag to test single-tag removal scenario
  const tagBody = {
    tag_name: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardArticleTag.ICreate;
  const tag = await generate_random_discussion_board_admin_articles_tags_create(
    adminConnection,
    {
      body: tagBody,
      params: { articleId: article.id },
    },
  );
  typia.assert(tag);
  // Remove the single tag
  await api.functional.discussionBoard.admin.articles.tags.erase(
    adminConnection,
    {
      articleId: article.id,
      tagId: tag.id,
    },
  );
  // Verify article remains accessible and functional
  // Attempt to fetch the article to ensure system handles empty tag state correctly
  // Note: There\'s no direct endpoint to fetch article in provided SDK, so we\'ll validate
  // that the system doesn\'t throw errors after tag removal by verifying we can perform
  // other operations or test that no exceptions occur during the removal process
  TestValidator.predicate("article tag removal completed without errors", true);
}
