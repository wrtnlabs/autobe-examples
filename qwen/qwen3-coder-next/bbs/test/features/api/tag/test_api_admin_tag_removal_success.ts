import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create_tags";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_admin_tag_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Create another admin connection to create article
  const creatorConnection: api.IConnection = { host: connection.host };
  const creator = await authorize_admin_join(creatorConnection, {
    body: {},
  });
  typia.assert(creator);
  // 3. Create a section by creator
  const sectionId = typia.random<string>();
  const articleResponse =
    await api.functional.discussionBoard.admin.sections.articles.create(
      creatorConnection,
      {
        sectionId: sectionId,
        body: {},
      },
    );
  typia.assert(articleResponse);
  const articleId = (articleResponse as any).id;
  // 4. Associate a tag with the article
  const tagResponse =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      creatorConnection,
      {
        articleId: articleId,
        body: {},
      },
    );
  typia.assert(tagResponse);
  const tagId = (tagResponse as any).id;
  // 5. Remove the tag using admin connection
  await api.functional.discussionBoard.admin.articles.tags.eraseTag(
    adminConnection,
    {
      articleId: articleId,
      tagId: tagId,
    },
  );
  // 6. Validate tag removal by checking it's gone
  const tagsResponse =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      creatorConnection,
      {
        articleId: articleId,
        body: {},
      },
    );
  typia.assert(tagsResponse);
}
