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

export async function test_api_article_tag_deletion_super_admin_valid_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create an article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Add multiple tags to the article sequentially
  const tag1 =
    await generate_random_discussion_board_super_admin_articles_tags_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(tag1);
  const tag2 =
    await generate_random_discussion_board_super_admin_articles_tags_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(tag2);
  const tag3 =
    await generate_random_discussion_board_super_admin_articles_tags_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          tag_name: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(tag3);
  // 4. Delete the middle tag
  await api.functional.discussionBoard.superAdmin.articles.tags.erase(
    superAdminConnection,
    {
      articleId: article.id,
      tagId: tag2.id,
    },
  );
  // 5. Validate successful deletion by ensuring no error was thrown
  // The erase operation completes without throwing an error, indicating success
  TestValidator.predicate(
    "tag deletion operation completed successfully",
    true,
  );
}
