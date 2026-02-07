import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_super_admin_articles_files_upload";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_discussion_board_super_admin_file_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin joins to establish authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminToken: IDiscussionBoardSuperAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminToken);
  // 2. Create a section ID for testing (using generated UUID)
  const sectionId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Super admin creates an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Super admin uploads a file to the article using a generated UUID for articleId
  // Since IDiscussionBoardArticle has no properties defined, we generate a UUID for the articleId
  const articleId: string = typia.random<string & tags.Format<"uuid">>();
  const file: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.superAdmin.articles.files.upload(
      superAdminConnection,
      {
        articleId: articleId,
        body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
      },
    );
  typia.assert(file);
}
