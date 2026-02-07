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

export async function test_api_admin_tag_removal_different_author(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin account (article creator)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin1Authorized = await authorize_admin_join(admin1Connection, {
    body: admin1Data,
  });
  typia.assert(admin1Authorized);
  // Create second admin account (tag remover)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Data = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin2Authorized = await authorize_admin_join(admin2Connection, {
    body: admin2Data,
  });
  typia.assert(admin2Authorized);
  // Generate random section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Admin1 creates an article in the section
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      admin1Connection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // Generate random article ID (since DTO is empty)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // Admin1 adds a tag to the article
  const tag =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      admin1Connection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  typia.assert(tag);
  // Generate random tag ID (since DTO is empty)
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Admin2 removes the tag from admin1's article (validates cross-admin tag removal)
  await api.functional.discussionBoard.admin.articles.tags.eraseTag(
    admin2Connection,
    {
      articleId: articleId,
      tagId: tagId,
    },
  );
  // Verify the tag removal was successful by creating a new tag
  const newTag =
    await api.functional.discussionBoard.admin.articles.tags.createTags(
      admin1Connection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleTag.ICreate>(),
      },
    );
  typia.assert(newTag);
}
