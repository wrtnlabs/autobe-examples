import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_deletion_last_remaining_tag(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // Create article with random data
  const articleBody = {
    title: RandomGenerator.paragraph({
      sentences: 2,
    }) satisfies string as string,
    content: RandomGenerator.content({
      paragraphs: 2,
    }) satisfies string as string,
    discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      { body: articleBody },
    );
  typia.assert(article);
  // Add a single tag to create the last tag scenario
  const tagBody = {
    tag_name: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardArticleTag.ICreate;
  const tag =
    await generate_random_discussion_board_super_admin_articles_tags_create(
      superAdminConnection,
      {
        body: tagBody,
        params: { articleId: article.id },
      },
    );
  typia.assert(tag);
  // Delete the last remaining tag
  await api.functional.discussionBoard.superAdmin.articles.tags.erase(
    superAdminConnection,
    {
      articleId: article.id,
      tagId: tag.id,
    },
  );
  // The deletion succeeds if no error is thrown
  // Note: We cannot verify the article has no tags because there's no GET endpoint
  // provided to retrieve article with its tags, but successful deletion is sufficient
  // for this edge case test.
}
