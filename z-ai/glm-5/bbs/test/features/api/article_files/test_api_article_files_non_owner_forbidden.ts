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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test authorization enforcement when a non-author attempts to modify article file attachments.
 *
 * This test verifies that only the article owner can modify file attachments.
 * A non-owner attempting to update files should receive a 403 Forbidden error.
 */
export async function test_api_article_files_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register User A (article owner)
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(userA);
  // 2. Register User B (different user - non-owner)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(userB);
  // 3. User A creates an article with file attachments
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        files: [
          {
            original_filename: "document.pdf",
            storage_path: "https://example.com/files/document.pdf",
            file_size: 1024,
            mime_type: "application/pdf",
          } satisfies IDiscussionBoardArticleFile.ICreate,
        ],
      },
    },
  );
  typia.assert(article);
  // 4. User B (non-owner) attempts to modify files on User A's article
  // This should result in 403 Forbidden error
  await TestValidator.httpError(
    "non-owner should be forbidden from modifying article files",
    403,
    async () =>
      await api.functional.discussionBoard.articles.files.updateFiles(
        userBConnection,
        {
          articleId: article.id,
          body: {
            original_filename: "modified_filename.pdf",
          } satisfies IDiscussionBoardArticleFile.IUpdate,
        },
      ),
  );
}
