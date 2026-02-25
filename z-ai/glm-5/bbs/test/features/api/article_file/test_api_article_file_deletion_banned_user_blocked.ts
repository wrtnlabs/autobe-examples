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

export async function test_api_article_file_deletion_banned_user_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // 2. Create an article with a file attachment
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        sectionId: typia.random<string & typia.tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        files: [
          {
            original_filename: "test-document.pdf",
            storage_path: "file://uploads/test-document.pdf",
            file_size: 102400,
            mime_type: "application/pdf",
          },
        ],
      },
    },
  );
  typia.assert(article);
  // Verify article was created with file
  TestValidator.predicate("article has file", article.files.length > 0);
  const file = article.files[0];
  // 3. Attempt to delete the file as banned user
  // Expecting HTTP 403 Forbidden with USER_BANNED error
  await TestValidator.httpError(
    "banned user cannot delete file",
    403,
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
