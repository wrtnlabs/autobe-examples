import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_superadmin_add_tags_to_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  // 2. Create a section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSection.ICreate>(),
      },
    );
  typia.assert(section);
  // 3. Create an article in the section
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Add tags to the article
  const tagResponse =
    await api.functional.discussionBoard.superAdmin.articles.tags.addTags(
      superAdminConnection,
      {
        articleId: article.id,
        body: typia.random<IDiscussionBoardArticle.ITagsRequest>(),
      },
    );
  typia.assert(tagResponse);
  // 5. Validate response structure
  TestValidator.equals("status is success", tagResponse.status, "success");
  TestValidator.predicate(
    "tagsAdded count is non-negative",
    tagResponse.tagsAdded >= 0,
  );
}
