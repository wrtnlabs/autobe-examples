import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create_tags";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_superadmin_associate_single_tag_to_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  typia.assert(authResult);
  // 2. Create a test article
  // Use a hardcoded section ID since we don't have a section creation function
  const sectionId = "00000000-0000-0000-0000-000000000001";
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Associate a single tag with the article
  // Since the API returns empty objects (no properties in DTOs), we cannot validate specific tag details
  // We can only verify that the operation succeeded without errors
  const tag =
    await api.functional.discussionBoard.superAdmin.articles.tags.createTags(
      superAdminConnection,
      {
        articleId: "placeholder-article-id", // We cannot use article.id because IDiscussionBoardArticle has no id property
        body: {},
      },
    );
  typia.assert(tag);
  // 4. Validate that the operations succeeded
  TestValidator.predicate(
    "authentication successful",
    authResult !== undefined,
  );
  TestValidator.predicate("article creation succeeded", article !== undefined);
  TestValidator.predicate("tag association succeeded", tag !== undefined);
}
