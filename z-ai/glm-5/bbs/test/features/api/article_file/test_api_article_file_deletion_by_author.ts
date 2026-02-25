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
 * Test the primary success path where an article author successfully deletes
 * their own file attachment.
 *
 * This test validates:
 * - Only the article author can delete file attachments
 * - File deletion returns void (204 No Content)
 * - Deletion is permanent - subsequent deletion attempts fail
 */
export async function test_api_article_file_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Attach a file to the article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(file);
  // 4. Delete the file as the author - should succeed with void response
  await api.functional.discussionBoard.user.articles.files.erase(
    userConnection,
    {
      articleId: article.id,
      fileId: file.id,
    },
  );
  // 5. Verify file was deleted - subsequent deletion should fail (404)
  await TestValidator.error(
    "second deletion should fail - file no longer exists",
    async () => {
      await api.functional.discussionBoard.user.articles.files.erase(
        userConnection,
        {
          articleId: article.id,
          fileId: file.id,
        },
      );
    },
  );
}
