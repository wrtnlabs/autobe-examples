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

export async function test_api_superadmin_article_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create an article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create a tag for the article
  const createdTag =
    await generate_random_discussion_board_super_admin_articles_tags_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: RandomGenerator.name(1),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(createdTag);
  // 4. Retrieve the specific tag
  const retrievedTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.at(
      superAdminConnection,
      {
        articleId: article.id,
        tagId: createdTag.id,
      },
    );
  typia.assert(retrievedTag);
  // 5. Validate the retrieved tag matches the created tag
  TestValidator.equals("tag ID matches", retrievedTag.id, createdTag.id);
  TestValidator.equals(
    "tag name matches",
    retrievedTag.tag_name,
    createdTag.tag_name,
  );
  TestValidator.equals(
    "article ID matches",
    retrievedTag.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "has created timestamp",
    retrievedTag.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated timestamp",
    retrievedTag.updated_at !== undefined,
  );
  TestValidator.equals(
    "article reference exists",
    retrievedTag.article.id,
    article.id,
  );
}
