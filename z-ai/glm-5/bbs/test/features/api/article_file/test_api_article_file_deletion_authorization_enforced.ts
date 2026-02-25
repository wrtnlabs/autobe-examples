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
 * Test authorization enforcement: a non-author user cannot delete file attachments
 * from another user's article.
 *
 * This test validates that the DELETE /discussionBoard/user/articles/{articleId}/files/{fileId}
 * endpoint properly enforces authorization by returning HTTP 403 Forbidden when a user
 * who is not the article author attempts to delete a file attachment.
 */
export async function test_api_article_file_deletion_authorization_enforced(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: User1 registers and authenticates
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {});
  typia.assert(user1);
  // Step 2: User1 creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {},
  );
  typia.assert(article);
  // Step 3: User1 attaches a file to their article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      user1Connection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(file);
  // Step 4: User2 registers and authenticates (different user)
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {});
  typia.assert(user2);
  // Step 5 & 6: User2 attempts to delete User1's file - should return 403 Forbidden
  await TestValidator.httpError(
    "non-author cannot delete file attachment",
    403,
    async () => {
      await api.functional.discussionBoard.user.articles.files.erase(
        user2Connection,
        {
          articleId: article.id,
          fileId: file.id,
        },
      );
    },
  );
}
