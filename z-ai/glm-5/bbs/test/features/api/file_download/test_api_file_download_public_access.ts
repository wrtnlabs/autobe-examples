import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test public file download access.
 *
 * Validates that an unauthenticated (guest) user can download a file
 * attachment from an existing article. This tests the core business
 * requirement that file downloads are publicly accessible without
 * authentication.
 */
export async function test_api_file_download_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attach a file to the article
  const uploadedFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(uploadedFile);
  // 4. Create a guest connection WITHOUT authentication (public access)
  const guestConnection: api.IConnection = { host: connection.host };
  // 5. Download the file as a guest (no authentication required)
  const downloadedFile = await api.functional.discussionBoard.articles.files.at(
    guestConnection,
    {
      articleId: article.id,
      fileId: uploadedFile.id,
    },
  );
  typia.assert(downloadedFile);
  // 6. Validate that the file metadata matches the uploaded file
  TestValidator.equals("file id matches", downloadedFile.id, uploadedFile.id);
  TestValidator.equals(
    "original filename matches",
    downloadedFile.original_filename,
    uploadedFile.original_filename,
  );
  TestValidator.equals(
    "file size matches",
    downloadedFile.file_size,
    uploadedFile.file_size,
  );
  TestValidator.equals(
    "mime type matches",
    downloadedFile.mime_type,
    uploadedFile.mime_type,
  );
}
