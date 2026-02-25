import api from "@ORGANIZATION/PROJECT-api";
import { tags } from "typia";
import typia from "typia";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";
import { TestValidator } from "@nestia/e2e";

export async function test_api_super_administrator_article_file_metadata_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(superAdminAuth);
  // 2. Prepare registered user connection
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUserAuth = await authorize_registered_user_join(
    registeredUserConnection,
    { body: {} },
  );
  typia.assert(registeredUserAuth);
  // 3. Registered user creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      registeredUserConnection,
      { body: {} },
    );
  typia.assert(article);
  // 4. Registered user attaches a file to the article
  const attachedFile =
    await generate_random_discussion_board_registered_user_articles_files_create_file(
      registeredUserConnection,
      {
        params: { articleId: article.id },
        body: {},
      },
    );
  typia.assert(attachedFile);
  // 5. As super administrator, try to get file metadata with a non-existent fileId
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "super administrator article file - file metadata not found",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.files.atFile(
        superAdminConnection,
        { articleId: article.id, fileId: nonExistentFileId },
      );
    },
  );
}
