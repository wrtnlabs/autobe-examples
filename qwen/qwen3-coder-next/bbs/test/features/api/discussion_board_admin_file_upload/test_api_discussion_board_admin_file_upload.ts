import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_files_upload } from "../../../generate/generate_random_discussion_board_admin_articles_files_upload";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test admin file upload functionality for discussion board
 *
 * This test validates that administrators can upload file attachments to
 * existing articles by testing the admin file upload workflow.
 */
export async function test_api_discussion_board_admin_file_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create a new article to attach files to
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: typia.random<string>(),
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Upload a file to the article as an administrator
  const uploadedFile =
    await api.functional.discussionBoard.admin.articles.files.upload(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardArticleFile.ICreate>(),
      },
    );
  typia.assert(uploadedFile);
}
