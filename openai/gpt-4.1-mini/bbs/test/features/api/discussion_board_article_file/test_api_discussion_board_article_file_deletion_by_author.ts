import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_files_create_file } from "../../../generate/generate_random_discussion_board_registered_user_articles_files_create_file";

export async function test_api_discussion_board_article_file_deletion_by_author(
  connection: api.IConnection
): Promise<void> {
  // 1. Register and authenticate the user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorized);

  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorized.token.access };

  // 2. Create an article by the user
  const article = await generate_random_discussion_board_registered_user_articles_create(
    userConnection,
    { body: {} }
  );
  typia.assert(article);
  const articleId = (article as any).id as string;

  // 3. Attach a file to the article
  const file = await generate_random_discussion_board_registered_user_articles_files_create_file(
    userConnection,
    { params: { articleId }, body: {} }
  );
  typia.assert(file);
  const fileId = (file as any).id as string;

  // 4. Delete the attached file
  await api.functional.discussionBoard.registeredUser.articles.files.erase(userConnection, {
    articleId,
    fileId,
  });

  // 5. Verify file deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "deleting a non-existent file throws error",
    async () => {
      await api.functional.discussionBoard.registeredUser.articles.files.erase(userConnection, {
        articleId,
        fileId,
      });
    }
  );
}
